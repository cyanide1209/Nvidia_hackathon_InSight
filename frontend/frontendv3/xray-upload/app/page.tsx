import type { Metadata } from "next"
import XrayUploader from "@/components/xray-uploader"

export const metadata: Metadata = {
  title: "InSight | X-ray Analysis",
  description: "Upload and analyze X-ray images",
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24">
      <div className="w-full max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">InSight</h1>
        <p className="text-center text-muted-foreground mb-8">Upload your X-ray image for analysis</p>
        <XrayUploader />
      </div>
    </main>
  )
}

