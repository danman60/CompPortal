// @ts-nocheck
/**
 * React Component Pattern for CompPortal
 *
 * Use this as a template for new components
 * Follows glassmorphic design system and tRPC patterns
 */

'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import toast from 'react-hot-toast'

interface ExampleComponentProps {
  // Define props with TypeScript
  title: string
  onSuccess?: () => void
}

export default function ExampleComponent({ title, onSuccess }: ExampleComponentProps) {
  // Local state
  const [isOpen, setIsOpen] = useState(false)

  // tRPC queries
  const { data, isLoading, error } = trpc.example.list.useQuery()

  // tRPC mutations
  const createMutation = trpc.example.create.useMutation({
    onSuccess: () => {
      toast.success('Created successfully', { position: 'top-right' })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`, { position: 'top-right' })
    }
  })

  // Event handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    createMutation.mutate({ /* data */ })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-white/20 rounded w-3/4"></div>
          <div className="h-4 bg-white/20 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-md rounded-xl border border-red-500/20 p-6">
        <p className="text-red-300">Error: {error.message}</p>
      </div>
    )
  }

  // Main render
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      {/* Header with emoji icon */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">🎭</span>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {data?.map((item) => (
          <div
            key={item.id}
            className="bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-4"
          >
            <p className="text-white">{item.name}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
        >
          Add New
        </button>
      </div>
    </div>
  )
}

/**
 * Key Patterns:
 *
 * 1. Glassmorphic Design:
 *    - bg-white/10 backdrop-blur-md
 *    - border border-white/20
 *    - rounded-xl for cards
 *
 * 2. tRPC Integration:
 *    - useQuery for data fetching
 *    - useMutation for updates
 *    - Cache invalidation on success
 *
 * 3. Toast Notifications:
 *    - Success: toast.success()
 *    - Error: toast.error()
 *    - Position: top-right
 *
 * 4. Loading States:
 *    - Skeleton screens with shimmer
 *    - Match content structure
 *
 * 5. Error Handling:
 *    - Show user-friendly messages
 *    - Red theme for errors
 *
 * 6. Accessibility:
 *    - Semantic HTML
 *    - ARIA labels where needed
 *    - Keyboard navigation
 */
