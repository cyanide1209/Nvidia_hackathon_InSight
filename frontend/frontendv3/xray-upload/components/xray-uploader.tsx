"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, Loader2, AlertCircle } from "lucide-react"
import Image from "next/image"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function XrayUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [uploadMethod, setUploadMethod] = useState<"direct" | "proxy">("direct")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check file size
      if (selectedFile.size > 5 * 1024 * 1024) {
        // 5MB limit
        setError("File is too large. Please select an image smaller than 5MB.")
        return
      }

      setFile(selectedFile)
      setError(null)
      setDebugInfo(null)
      setResult(null)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)

      // Log file details for debugging
      console.log(`Selected file: ${selectedFile.name}, type: ${selectedFile.type}, size: ${selectedFile.size} bytes`)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an X-ray image to upload")
      return
    }

    setLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      const formData = new FormData()
      formData.append("image", file)

      // Log what we're sending
      console.log(`Uploading file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`)
      console.log(`Using ${uploadMethod} upload method`)

      let response
      const startTime = Date.now()

      if (uploadMethod === "direct") {
        // Direct upload to Flask backend
        const endpoint = "http://127.0.0.1:5000/upload"
        console.log(`Uploading directly to backend at ${endpoint}`)

        try {
          response = await fetch(endpoint, {
            method: "POST",
            body: formData,
          })
        } catch (fetchError) {
          // Capture network-level errors
          console.error("Network error during fetch:", fetchError)
          throw new Error(
            `Network error: ${fetchError.message}. Make sure your backend is running at http://127.0.0.1:5000`,
          )
        }
      } else {
        // Upload via Next.js proxy
        console.log("Uploading via proxy endpoint")
        try {
          response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          })
        } catch (fetchError) {
          console.error("Network error during proxy fetch:", fetchError)
          throw new Error(`Network error with proxy: ${fetchError.message}`)
        }
      }

      const endTime = Date.now()
      console.log(`Request took ${endTime - startTime}ms`)

      if (!response.ok) {
        let errorMessage = `Server responded with status: ${response.status} ${response.statusText}`
        let responseText = ""

        try {
          responseText = await response.text()
          console.error("Error response text:", responseText)

          try {
            // Try to parse as JSON
            const errorData = JSON.parse(responseText)
            if (errorData && errorData.error) {
              errorMessage = errorData.error
            }
          } catch (jsonError) {
            // If not JSON, use the text
            if (responseText) {
              errorMessage += `\n\nDetails: ${responseText}`
            }
          }
        } catch (textError) {
          console.error("Failed to get response text:", textError)
        }

        setDebugInfo(
          `Response status: ${response.status} ${response.statusText}\nResponse headers: ${JSON.stringify(Object.fromEntries([...response.headers]), null, 2)}`,
        )
        throw new Error(errorMessage)
      }

      let data
      try {
        data = await response.json()
        console.log("Upload successful, response:", data)
        setResult(data)
      } catch (jsonError) {
        console.error("Failed to parse JSON response:", jsonError)
        const responseText = await response.text()
        setDebugInfo(`Response was not valid JSON. Raw response:\n${responseText}`)
        throw new Error("Server returned invalid JSON response")
      }
    } catch (err) {
      console.error("Upload error:", err)
      setError(err instanceof Error ? err.message : "Failed to upload image")
    } finally {
      setLoading(false)
    }
  }

  const clearImage = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setDebugInfo(null)
  }

  const toggleUploadMethod = () => {
    setUploadMethod((prev) => (prev === "direct" ? "proxy" : "direct"))
  }

  const testBackendConnection = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/", {
        method: "GET",
      })

      const data = await response.text()
      setDebugInfo(`Backend connection test: ${response.status} ${response.statusText}\n\nResponse: ${data}`)
    } catch (err) {
      setDebugInfo(`Backend connection test failed: ${err.message}`)
    }
  }

  // Format the medical report text to clean paragraphs
  const formatMedicalReport = (text: string) => {
    if (!text) return ""

    // Clean up any special characters or unwanted formatting
    const cleanText = text
      .replace(/\\n/g, "\n") // Replace literal \n with actual line breaks
      .replace(/\\"/g, '"') // Replace escaped quotes
      .replace(/\n(\d+)/g, "\n$1") // Fix numbered lists that might have \n7 etc.
      .replace(/\n+/g, "\n\n") // Standardize line breaks to double for paragraphs
      .trim()

    return cleanText
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-6">
          {!preview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center flex flex-col items-center justify-center">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />

              <div className="flex flex-col items-center justify-center">
                <Button variant="outline" className="mb-2" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Upload an X-ray image
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </Button>
                <p className="text-sm text-gray-500">or drag and drop</p>
              </div>

              <p className="text-xs leading-5 text-gray-600 mt-4">PNG, JPG, GIF up to 5MB</p>
            </div>
          ) : (
            <div className="relative">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                <Image src={preview || "/placeholder.svg"} alt="X-ray preview" fill className="object-contain" />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove image</span>
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap break-words">{error}</AlertDescription>
            </Alert>
          )}

          {debugInfo && (
            <Alert>
              <AlertTitle>Debug Information</AlertTitle>
              <AlertDescription>
                <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto whitespace-pre-wrap">
                  {debugInfo}
                </pre>
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Analysis Results</h3>

              {result.medical_report ? (
                <div className="text-gray-900 leading-relaxed">
                  {formatMedicalReport(result.medical_report)
                    .split("\n\n")
                    .map((paragraph, i) => (
                      <p key={i} className="mb-4">
                        {paragraph}
                      </p>
                    ))}
                </div>
              ) : (
                <div className="text-gray-900">
                  <p>No medical report found in the response.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-2">
            <Button onClick={handleUpload} disabled={!file || loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Analyze X-ray"
              )}
            </Button>
            <Button variant="outline" onClick={toggleUploadMethod} className="w-full">
              Using: {uploadMethod === "direct" ? "Direct Upload" : "Proxy Upload"}
            </Button>
            <Button variant="secondary" onClick={testBackendConnection} className="w-full">
              Test Backend
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            Endpoint:{" "}
            {uploadMethod === "direct" ? "http://127.0.0.1:5000/upload" : "/api/upload → 127.0.0.1:5000/upload"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

