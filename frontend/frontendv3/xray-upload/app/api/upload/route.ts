import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // Log what we received
    console.log(
      "Received form data:",
      Array.from(formData.entries()).map(([key, value]) => {
        return `${key}: ${value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value}`
      }),
    )

    // Forward to the Python backend
    try {
      console.log("Forwarding to backend at http://127.0.0.1:5000/upload")
      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      })

      console.log(`Backend responded with status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        // Try to get error details
        let errorMessage = `Backend error: ${response.status} ${response.statusText}`
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

        return NextResponse.json({ error: errorMessage }, { status: response.status })
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError) {
      console.error("Fetch to backend failed:", fetchError)
      return NextResponse.json(
        {
          error: `Failed to connect to backend: ${fetchError.message}`,
          details: "Make sure your Flask server is running at http://127.0.0.1:5000",
        },
        { status: 502 },
      )
    }
  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

