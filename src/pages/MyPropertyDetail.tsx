import { useParams, useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { ArrowLeft } from 'lucide-react'

export default function MyPropertyDetail() {
  useRequireAuth()
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/my-properties')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Properties
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Property Details</h1>
        <p className="text-gray-500">Full property management view coming soon.</p>
      </div>
    </Layout>
  )
}
