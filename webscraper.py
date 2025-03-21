import requests
import os
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup

text_file_dir = "articles"
if not os.path.exists(text_file_dir):
    os.makedirs(text_file_dir)

# Keywords focused on medical/X-ray context
keywords = [
    "Chest X-ray pneumonia diagnosis",
    "Chest X-ray pleural effusion symptoms",
    "How to read a chest X-ray",
    "ChexNet research paper summary",
    "Lung infiltrates X-ray explanation",
    "Radiology report examples",
    "Radiographic signs of tuberculosis",
    "Chest radiology report interpretation",
    "Lung collapse on X-ray",
    "Clinical findings for pulmonary fibrosis X-ray"
]

articles = []
    
for word in keywords:
    search_query = word
    with DDGS() as ddgs: #duckduckgo search
        results = ddgs.text(search_query)
        for result in results:
            #retrieve article title and url
            article_url = result["href"]  
            title = result["title"]
                    
            try:
                response = requests.get(article_url, timeout=30)
                response.raise_for_status()
            except requests.exceptions.RequestException: # checking for connection, HTTP errors, etc.
                continue
                    
            soup = BeautifulSoup(response.content, 'html.parser')
            paragraphs = soup.find_all('p')
            paragraphs_text = []
            # get paragraph text and include it in txt file
            for p in paragraphs:
                text = p.get_text()  
                paragraphs_text.append(text)

            article_text = " ".join(paragraphs_text)

            text_file_name = f"{title}.txt"
            text_file_path = os.path.join(text_file_dir, text_file_name)
                        
            #writing text to created txt file
            with open(text_file_path, "w", encoding="utf-8") as file:
                file.write(f"{article_url}\n{article_text}")