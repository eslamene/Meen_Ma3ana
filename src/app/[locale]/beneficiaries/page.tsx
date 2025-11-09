'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, User, Phone, MapPin, Calendar, Eye, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BeneficiaryService } from '@/lib/services/beneficiaryService'
import { LookupService } from '@/lib/services/lookupService'
import type { Beneficiary } from '@/types/beneficiary'
import type { City, IdType } from '@/types/beneficiary'

export default function BeneficiariesPage() {
  const t = useTranslations('beneficiaries')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  
  // State
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [filteredBeneficiaries, setFilteredBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [cities, setCities] = useState<City[]>([])
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [beneficiariesData, citiesData] = await Promise.all([
          BeneficiaryService.getAll(),
          LookupService.getCities(),
          LookupService.getIdTypes()
        ])
        setBeneficiaries(beneficiariesData)
        setFilteredBeneficiaries(beneficiariesData)
        setCities(citiesData)
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filter beneficiaries
  useEffect(() => {
    let filtered = beneficiaries

    if (searchQuery) {
      filtered = filtered.filter(beneficiary =>
        beneficiary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        beneficiary.mobile_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        beneficiary.national_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        beneficiary.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (cityFilter && cityFilter !== 'all') {
      filtered = filtered.filter(beneficiary => beneficiary.city_id === cityFilter)
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(beneficiary => beneficiary.risk_level === statusFilter)
    }

    setFilteredBeneficiaries(filtered)
  }, [beneficiaries, searchQuery, cityFilter, statusFilter])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleViewBeneficiary = (beneficiary: Beneficiary) => {
    router.push(`/${locale}/beneficiaries/${beneficiary.id}`)
  }

  const handleEditBeneficiary = (beneficiary: Beneficiary) => {
    router.push(`/${locale}/beneficiaries/${beneficiary.id}/edit`)
  }

  const handleDeleteBeneficiary = async (beneficiary: Beneficiary) => {
    try {
      setDeleting(true)
      await BeneficiaryService.delete(beneficiary.id)
      setBeneficiaries(prev => prev.filter(b => b.id !== beneficiary.id))
      setFilteredBeneficiaries(prev => prev.filter(b => b.id !== beneficiary.id))
      setIsDeleteDialogOpen(false)
      setSelectedBeneficiary(null)
    } catch (error) {
      console.error('Error deleting beneficiary:', error)
      alert('Failed to delete beneficiary')
    } finally {
      setDeleting(false)
    }
  }

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title') || 'Beneficiaries'}</h1>
          <p className="text-gray-600 mt-2">{t('subtitle') || 'Manage beneficiary profiles and documents'}</p>
        </div>
        <Button onClick={() => router.push(`/${locale}/beneficiaries/create`)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          {t('addBeneficiary') || 'Add Beneficiary'}
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filters') || 'Filters'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {t('search') || 'Search'}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('searchPlaceholder') || 'Search by name, mobile, ID...'}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {t('city') || 'City'}
              </label>
              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('allCities') || 'All Cities'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCities') || 'All Cities'}</SelectItem>
                  {cities.filter(city => city.id && city.id.trim() !== '').map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {t('riskLevel') || 'Risk Level'}
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('allLevels') || 'All Levels'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allLevels') || 'All Levels'}</SelectItem>
                  <SelectItem value="low">{t('low') || 'Low'}</SelectItem>
                  <SelectItem value="medium">{t('medium') || 'Medium'}</SelectItem>
                  <SelectItem value="high">{t('high') || 'High'}</SelectItem>
                  <SelectItem value="critical">{t('critical') || 'Critical'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setCityFilter('')
                  setStatusFilter('')
                }}
                className="w-full"
              >
                {t('clearFilters') || 'Clear Filters'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Beneficiaries List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBeneficiaries.map((beneficiary) => (
          <Card key={beneficiary.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{beneficiary.name}</h3>
                    {beneficiary.is_verified && (
                      <Badge className="bg-green-500 text-white text-xs mt-1">
                        {t('verified') || 'Verified'}
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge className={getRiskLevelColor(beneficiary.risk_level)}>
                  {t(beneficiary.risk_level) || beneficiary.risk_level}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm text-gray-600">
                {beneficiary.mobile_number && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{beneficiary.mobile_number}</span>
                  </div>
                )}
                
                {beneficiary.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{beneficiary.city}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{t('created') || 'Created'}: {formatDate(beneficiary.created_at)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewBeneficiary(beneficiary)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {t('view') || 'View'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditBeneficiary(beneficiary)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {t('edit') || 'Edit'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedBeneficiary(beneficiary)
                    setIsDeleteDialogOpen(true)
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBeneficiaries.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('noBeneficiaries') || 'No beneficiaries found'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || cityFilter || statusFilter 
                ? t('noBeneficiariesFiltered') || 'Try adjusting your filters'
                : t('noBeneficiariesDescription') || 'Get started by adding your first beneficiary'
              }
            </p>
            <Button onClick={() => router.push(`/${locale}/beneficiaries/create`)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addFirstBeneficiary') || 'Add First Beneficiary'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteBeneficiary') || 'Delete Beneficiary'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              {t('deleteConfirmation') || 'Are you sure you want to delete this beneficiary? This action cannot be undone.'}
            </p>
            {selectedBeneficiary && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedBeneficiary.name}</p>
                <p className="text-sm text-gray-600">{selectedBeneficiary.mobile_number}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedBeneficiary && handleDeleteBeneficiary(selectedBeneficiary)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('deleting') || 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('delete') || 'Delete'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
