import { useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, X, File, Image, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'

interface AttachmentsStepProps {
  files: File[]
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (index: number) => void
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return Image
  if (['xlsx', 'xls', 'csv'].includes(ext || '')) return FileSpreadsheet
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return FileText
  return File
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentsStep({ files, onFileUpload, onRemoveFile }: AttachmentsStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const dt = e.dataTransfer
    if (dt.files && dt.files.length > 0) {
      const syntheticEvent = { target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>
      onFileUpload(syntheticEvent)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supporting Documents</CardTitle>
        <CardDescription>Upload quotes, contracts, invoices, or any relevant supporting documents</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3 group-hover:text-blue-500" />
          <p className="text-gray-700 font-medium mb-1">Drop files here or click to browse</p>
          <p className="text-xs text-gray-500">PDF, DOCX, XLSX, PNG, JPG — max 25MB each</p>
          <Button type="button" variant="outline" className="mt-4" onClick={e => { e.stopPropagation(); inputRef.current?.click() }}>Select Files</Button>
          <input ref={inputRef} type="file" multiple className="hidden" onChange={onFileUpload} />
        </div>

        {files.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Attached files ({files.length})</h4>
              <span className="text-xs text-gray-500">{formatFileSize(files.reduce((sum, f) => sum + f.size, 0))} total</span>
            </div>
            <div className="space-y-2">
              {files.map((file, i) => {
                const Icon = getFileIcon(file.name)
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100" onClick={() => onRemoveFile(i)}><X className="w-4 h-4" /></Button>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800"><p className="font-medium">Documents are securely stored</p><p className="text-blue-700 mt-0.5">All attachments are encrypted and linked to this request.</p></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
