'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import Container from '@/components/layout/Container'
import { useLayout } from '@/components/layout/LayoutProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ProjectCycle {
  id: string
  cycleNumber: number
  startDate: string
  endDate: string
  targetAmount: string
  currentAmount: string
  status: string
  progressPercentage: string
  notes: string | null
  completedAt: string | null
}

interface Project {
  id: string
  name: string
  description: string
  category: string
  targetAmount: string
  currentAmount: string
  status: string
  cycleDuration: string
  cycleDurationDays: number
  currentCycleNumber: number
  totalCycles: number | null
  nextCycleDate: string
  lastCycleDate: string | null
  autoProgress: boolean
  createdBy: string
  createdAt: string
  cycles: ProjectCycle[]
}

export default function ProjectDetailPage() {
  const t = useTranslations('projects')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const projectId = params.id as string
  const { containerVariant } = useLayout()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProject()
  }, [projectId])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)
      
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      } else {
        setError('Failed to fetch project')
      }
    } catch (error) {
      setError('An error occurred while fetching project')
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
            <div>
              <div className="h-32 bg-gray-200 rounded mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Project not found'}</p>
          <Button onClick={() => router.push(`/${locale}/projects`)}>
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  const currentCycle = project.cycles.find(cycle => cycle.status === 'active')
  const completedCycles = project.cycles.filter(cycle => cycle.status === 'completed')

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
            <p className="text-gray-600">{project.description}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.push(`/${locale}/projects`)}>
              Back to Projects
            </Button>
            <Button onClick={() => router.push(`/${locale}/projects/${projectId}/edit`)}>
              Edit Project
            </Button>
          </div>
        </div>

        <div className="flex space-x-2 mb-6">
          <Badge className={getStatusColor(project.status)}>
            {project.status}
          </Badge>
          <Badge className={getCategoryColor(project.category)}>
            {project.category}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="cycles">Cycles</TabsTrigger>
              <TabsTrigger value="contributions">Contributions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Project Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Overall Progress</span>
                        <span>{formatAmount(project.currentAmount)} / {formatAmount(project.targetAmount)}</span>
                      </div>
                      <Progress 
                        value={calculateProgress(project.currentAmount, project.targetAmount)} 
                        className="h-3"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Current Cycle:</span>
                        <p className="font-medium">{project.currentCycleNumber}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Cycle Duration:</span>
                        <p className="font-medium capitalize">{project.cycleDuration}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Cycles:</span>
                        <p className="font-medium">{project.totalCycles || 'Indefinite'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Auto Progress:</span>
                        <p className="font-medium">{project.autoProgress ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Cycle */}
              {currentCycle && (
                <Card>
                  <CardHeader>
                    <CardTitle>Current Cycle ({currentCycle.cycleNumber})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Cycle Progress</span>
                          <span>{formatAmount(currentCycle.currentAmount)} / {formatAmount(currentCycle.targetAmount)}</span>
                        </div>
                        <Progress 
                          value={calculateProgress(currentCycle.currentAmount, currentCycle.targetAmount)} 
                          className="h-3"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Start Date:</span>
                          <p className="font-medium">{formatDate(currentCycle.startDate)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">End Date:</span>
                          <p className="font-medium">{formatDate(currentCycle.endDate)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <Badge className={getStatusColor(currentCycle.status)}>
                            {currentCycle.status}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-500">Progress:</span>
                          <p className="font-medium">{parseFloat(currentCycle.progressPercentage).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Cycles */}
              {completedCycles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Cycles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {completedCycles.slice(0, 3).map((cycle) => (
                        <div key={cycle.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">Cycle {cycle.cycleNumber}</p>
                            <p className="text-sm text-gray-500">
                              {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatAmount(cycle.currentAmount)}</p>
                            <p className="text-sm text-gray-500">
                              {parseFloat(cycle.progressPercentage).toFixed(1)}% complete
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="cycles" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Cycles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {project.cycles.map((cycle) => (
                      <div key={cycle.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold">Cycle {cycle.cycleNumber}</h3>
                            <p className="text-sm text-gray-500">
                              {formatDate(cycle.startDate)} - {formatDate(cycle.endDate)}
                            </p>
                          </div>
                          <Badge className={getStatusColor(cycle.status)}>
                            {cycle.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{formatAmount(cycle.currentAmount)} / {formatAmount(cycle.targetAmount)}</span>
                            </div>
                            <Progress 
                              value={calculateProgress(cycle.currentAmount, cycle.targetAmount)} 
                              className="h-2"
                            />
                          </div>
                          
                          {cycle.notes && (
                            <p className="text-sm text-gray-600">{cycle.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contributions">
              <Card>
                <CardHeader>
                  <CardTitle>Contributions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Contributions feature coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-gray-500">Created</span>
                <p className="font-medium">{formatDate(project.createdAt)}</p>
              </div>
              
              <div>
                <span className="text-sm text-gray-500">Next Cycle</span>
                <p className="font-medium">{formatDate(project.nextCycleDate)}</p>
              </div>
              
              {project.lastCycleDate && (
                <div>
                  <span className="text-sm text-gray-500">Last Cycle</span>
                  <p className="font-medium">{formatDate(project.lastCycleDate)}</p>
                </div>
              )}
              
              <div>
                <span className="text-sm text-gray-500">Cycle Duration</span>
                <p className="font-medium">{project.cycleDurationDays} days</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                Pause Project
              </Button>
              <Button className="w-full" variant="outline">
                Advance Cycle
              </Button>
              <Button className="w-full" variant="outline">
                View Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  )
} 