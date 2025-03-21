from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import base64
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain.schema import Document
from langchain_ollama.llms import OllamaLLM
import subprocess

app = Flask(__name__)
CORS(app)

# NVIDIA API details
NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
NVIDIA_API_TOKEN = "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"

# (Optional) run webscraper if needed
# subprocess.run(["python", "webscraper.py"])

# Load articles for RAG
training_text_folder = os.path.expanduser("/Users/arnavdixit/Downloads/articles")
documents = []

for filename in os.listdir(training_text_folder):
    if filename.endswith(".txt"):
        file_path = os.path.join(training_text_folder, filename)
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            documents.append(Document(page_content=content, metadata={"filename": filename}))

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1200, chunk_overlap=100, add_start_index=True)
split_documents = text_splitter.split_documents(documents)
local_embeddings = OllamaEmbeddings(model="all-minilm")
db_training_text = Chroma.from_documents(documents=split_documents, embedding=local_embeddings)
retriever_training_text = db_training_text.as_retriever(search_type="similarity", search_kwargs={"k": 3})
llm_local = OllamaLLM(model="llama3")

def analyze_image_with_nvidia(image_path):
    with open(image_path, "rb") as f:
        image_b64 = base64.b64encode(f.read()).decode()

    if len(image_b64) > 180_000:
        return {"error": "Image too large for NVIDIA API (must be <180KB base64)"}

    headers = {
        "Authorization": f"Bearer {NVIDIA_API_TOKEN}",
        "Accept": "application/json"
    }

    prompt = f"is there any complication with this chest scan - if so tell me any abnormalities you can see. I know you cannot formally diagnose. <img src='data:image/png;base64,{image_b64}' />"

    payload = {
        "model": 'meta/llama-3.2-11b-vision-instruct',
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 512,
        "temperature": 1.00,
        "top_p": 1.00,
        "stream": False
    }

    response = requests.post(NVIDIA_API_URL, headers=headers, json=payload)
    if response.status_code != 200:
        return {"error": response.text}
    
    return response.json()

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "status": "Backend running",
        "message": "Upload endpoint at /upload. Ready to analyze images via NVIDIA API."
    }), 200

@app.route('/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image_file = request.files['image']
    image_path = os.path.join("/tmp", image_file.filename)
    image_file.save(image_path)

    # Analyze image with NVIDIA Vision model
    analysis_result = analyze_image_with_nvidia(image_path)

    if "error" in analysis_result:
        return jsonify(analysis_result), 500

    # Get the text content of the NVIDIA result to use in RAG
    prediction_text = analysis_result['choices'][0]['message']['content']

    # Use RAG pipeline to generate a more detailed medical report
    context_docs = retriever_training_text.invoke(prediction_text)
    context_text = "\n".join([doc.page_content for doc in context_docs])
    prompt_llama = f"Write a detailed medical report explaining the following findings from a chest scan: {prediction_text}\nContext: {context_text}"
    report = llm_local.invoke(prompt_llama)

    return jsonify({
        "medical_report": report
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)