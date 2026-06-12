// Dynamic new-request page: renders the form schema for any catalog item
// and submits through the workflow engine. No per-type code.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import {
  CatalogItem,
  fetchCatalogItem,
  fetchFormSchema,
  fetchLookupOptions,
  submitCatalogRequest,
} from '@/api/platformApi'
import {
  DynamicForm,
  FieldError,
  FieldOption,
  FormSchema,
  FormValues,
  defaultValues,
  validateForm,
  pruneHiddenValues,
} from '@/forms'

export default function NewCatalogRequest() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [item, setItem] = useState<CatalogItem | null>(null)
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [lookupOptions, setLookupOptions] = useState<Record<string, FieldOption[]>>({})
  const [values, setValues] = useState<FormValues>({})
  const [errors, setErrors] = useState<FieldError[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!slug) return
    const load = async () => {
      try {
        const loadedItem = await fetchCatalogItem(slug)
        const loadedSchema = await fetchFormSchema(loadedItem.request_type)
        const lookups: Record<string, FieldOption[]> = {}
        await Promise.all(
          loadedSchema.fields
            .filter(f => f.source?.startsWith('lookup:'))
            .map(async f => { lookups[f.id] = await fetchLookupOptions(f.source!) })
        )
        setItem(loadedItem)
        setSchema(loadedSchema)
        setLookupOptions(lookups)
        setValues(defaultValues(loadedSchema))
      } catch (err) {
        toast.error('Failed to load this request type: ' + (err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const handleSubmit = async () => {
    if (!item || !schema || !user?.email) return
    const cleaned = pruneHiddenValues(schema, values)
    const fieldErrors = validateForm(schema, cleaned)
    setErrors(fieldErrors)
    if (fieldErrors.length) {
      toast.error('Please fix the highlighted fields')
      return
    }
    setSubmitting(true)
    try {
      const row = await submitCatalogRequest({
        item,
        schema,
        formData: cleaned,
        requesterEmail: user.email,
      })
      toast.success(`Request ${row.request_number} submitted`)
      navigate(`/requests/${row.id}`)
    } catch (err) {
      toast.error('Submission failed: ' + (err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>
  if (!item || !schema) {
    return (
      <div className="text-sm text-gray-500">
        This request type could not be loaded. <Link className="text-blue-600" to="/catalog">Back to catalog</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/catalog" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4 mr-1" /> Request Catalog
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{item.name}</h1>
        {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DynamicForm
            schema={schema}
            values={values}
            onChange={setValues}
            errors={errors}
            lookupOptions={lookupOptions}
            disabled={submitting}
          />
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              <Send className="w-4 h-4 mr-2" />
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
