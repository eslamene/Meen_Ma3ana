'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface Project {
  id: string
  name: string
  description: string
  category: string
  targetAmount: string
  currentAmount: string
  status: string
  cycleDuration: string
  currentCycleNumber: number
  totalCycles: number | null
  nextCycleDate: string
  createdAt: string
}

interface ProjectsResponse {
  projects: Project[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export default function ProjectsPage() {
  const t = useTranslations('projects')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const { containerVariant } = useLayout()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    search: '',
  })

  useEffect(() => {
    fetchProjects()
  }, [filters])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const searchParams = new URLSearchParams()
      
      if (filters.status && filters.status !== 'all') searchParams.append('status', filters.status)
      if (filters.category && filters.category !== 'all') searchParams.append('category', filters.category)
      if (filters.search) searchParams.append('search', filters.search)

      const response = await fetch(`/api/projects?${searchParams.toString()}`)
      
      if (response.ok) {
        const data: ProjectsResponse = await response.json()
        setProjects(data.projects)
      } else {
        setError('Failed to fetch projects')
      }
    } catch (error) {
      setError('An error occurred while fetching projects')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'education':
        return 'bg-blue-100 text-blue-800'
      case 'healthcare':
        return 'bg-red-100 text-red-800'
      case 'housing':
        return 'bg-green-100 text-green-800'
      case 'food':
        return 'bg-orange-100 text-orange-800'
      case 'emergency':
        return 'bg-purple-100 text-purple-800'
      case 'community':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatAmount = (amount: string) => {
    return `EGP ${parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const calculateProgress = (current: string, target: string) => {
    const currentAmount = parseFloat(current)
    const targetAmount = parseFloat(target)
    return targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0
  }

  const filteredProjects = projects.filter(project => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch = (
        project.name.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower)
      )
      if (!matchesSearch) return false
    }
    
    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (project.status !== filters.status) return false
    }
    
    // Category filter
    if (filters.category && filters.category !== 'all') {
      if (project.category !== filters.category) return false
    }
    
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Container variant={containerVariant} className="py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-gray-600">Manage recurring projects and funding cycles</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Container variant={containerVariant} className="py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-gray-600">Manage recurring projects and funding cycles</p>
          </div>
          <Button onClick={() => router.push(`/${locale}/projects/create`)}>
            Create Project
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <Input
              placeholder="Search projects..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          
          <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="healthcare">Healthcare</SelectItem>
              <SelectItem value="housing">Housing</SelectItem>
              <SelectItem value="food">Food Security</SelectItem>
              <SelectItem value="emergency">Emergency Relief</SelectItem>
              <SelectItem value="community">Community Development</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setFilters({ status: 'all', category: 'all', search: '' })}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">No projects found</p>
            <Button onClick={() => router.push(`/${locale}/projects/create`)}>
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/${locale}/projects/${project.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
                <Badge className={getCategoryColor(project.category)}>
                  {project.category}
                </Badge>
              </CardHeader>
              
              <CardContent>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {project.description}
                </p>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{formatAmount(project.currentAmount)} / {formatAmount(project.targetAmount)}</span>
                    </div>
                    <Progress 
                      value={calculateProgress(project.currentAmount, project.targetAmount)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Cycle:</span>
                      <p className="font-medium">{project.currentCycleNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <p className="font-medium capitalize">{project.cycleDuration}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Next Cycle:</span>
                      <p className="font-medium">{formatDate(project.nextCycleDate)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium">{formatDate(project.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </Container>
    </div>
  )
} 