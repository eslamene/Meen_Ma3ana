'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, User, Phone, MapPin, IdCard, AlertCircle, Search, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { BeneficiaryService } from '@/lib/services/beneficiaryService'
import { LookupService } from '@/lib/services/lookupService'
import type { CreateBeneficiaryData, City, IdType } from '@/types/beneficiary'

export default function CreateBeneficiaryPage() {
  const t = useTranslations('beneficiaries')
  const router = useRouter()
  
  // State
  const [formData, setFormData] = useState<CreateBeneficiaryData>({
    name: '',
    name_ar: '',
    age: undefined,
    gender: 'male',
    mobile_number: '',
    additional_mobile_number: '',
    email: '',
    alternative_contact: '',
    national_id: '',
    country: 'Egypt',
    id_type: 'national_id',
    id_type_id: '',
    city: '',
    city_id: '',
    address: '',
    medical_condition: '',
    notes: '',
    risk_level: 'low'
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  const [idTypes, setIdTypes] = useState<IdType[]>([])
  const [loading, setLoading] = useState(true)
  
  // City search state
  const [citySearchQuery, setCitySearchQuery] = useState('')
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false)
  const [filteredCities, setFilteredCities] = useState<City[]>([])
  const cityDropdownRef = useRef<HTMLDivElement>(null)

  // Load lookup data
  useEffect(() => {
    const loadLookupData = async () => {
      try {
        setLoading(true)
        const [citiesData, idTypesData] = await Promise.all([
          LookupService.getCities(),
          LookupService.getIdTypes()
        ])
        setCities(citiesData)
        setFilteredCities(citiesData)
        setIdTypes(idTypesData)
      } catch (error) {
        console.error('Error loading lookup data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLookupData()
  }, [])

  // Filter cities based on search query
  useEffect(() => {
    if (citySearchQuery.trim() === '') {
      setFilteredCities(cities)
    } else {
      const filtered = cities.filter(city => 
        city.name_en.toLowerCase().includes(citySearchQuery.toLowerCase()) ||
        city.name_ar.includes(citySearchQuery)
      )
      setFilteredCities(filtered)
    }
  }, [citySearchQuery, cities])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false)
      }
    }

    if (isCityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCityDropdownOpen])

  const handleChange = (field: keyof CreateBeneficiaryData, value: string | number | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // When ID type changes, also update the id_type field
      if (field === 'id_type_id') {
        const selectedIdType = idTypes.find(type => type.id === value)
        if (selectedIdType) {
          newData.id_type = selectedIdType.code as 'national_id' | 'passport' | 'other'
        }
      }
      
      return newData
    })

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Get dynamic label and placeholder based on ID type
  const getIDFieldInfo = () => {
    const selectedIdType = idTypes.find(type => type.id === formData.id_type_id)
    const idTypeName = selectedIdType?.name_en || 'ID'
    
    return {
      label: idTypeName,
      placeholder: `Enter ${idTypeName.toLowerCase()} number`
    }
  }

  const { label: idFieldLabel, placeholder: idFieldPlaceholder } = getIDFieldInfo()

  // Handle city selection
  const handleCitySelect = (city: City) => {
    setFormData(prev => ({
      ...prev,
      city_id: city.id,
      city: city.name_en
    }))
    setCitySearchQuery(city.name_en)
    setIsCityDropdownOpen(false)
  }

  // Handle city search input change
  const handleCitySearchChange = (value: string) => {
    setCitySearchQuery(value)
    setIsCityDropdownOpen(true)
    
    // Clear city selection if search doesn't match selected city
    if (formData.city && !value.toLowerCase().includes(formData.city.toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        city_id: '',
        city: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('validation.nameRequired') || 'Name is required'
    }

    if (!formData.mobile_number?.trim()) {
      newErrors.mobile_number = t('validation.mobileRequired') || 'Mobile number is required'
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('validation.emailInvalid') || 'Invalid email format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)
      const newBeneficiary = await BeneficiaryService.create(formData)
      router.push(`/beneficiaries/${newBeneficiary.id}`)
    } catch (error) {
      console.error('Error creating beneficiary:', error)
      alert('Failed to create beneficiary. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          onClick={() => router.push('/beneficiaries')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back') || 'Back'}
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('createBeneficiary') || 'Create Beneficiary'}</h1>
          <p className="text-gray-600 mt-1">{t('createBeneficiaryDescription') || 'Add a new beneficiary to the system'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('basicInformation') || 'Basic Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  {t('name') || 'Name'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={t('namePlaceholder') || 'Enter full name'}
                  className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="name_ar" className="text-sm font-medium">
                  {t('nameAr') || 'Name (Arabic)'}
                </Label>
                <Input
                  id="name_ar"
                  value={formData.name_ar || ''}
                  onChange={(e) => handleChange('name_ar', e.target.value)}
                  placeholder={t('nameArPlaceholder') || 'Enter name in Arabic'}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="age" className="text-sm font-medium">
                  {t('age') || 'Age'}
                </Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age || ''}
                  onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)}
                  placeholder={t('agePlaceholder') || 'Enter age'}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">
                  {t('gender') || 'Gender'}
                </Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(value) => handleChange('gender', value)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">{t('male') || 'Male'}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">{t('female') || 'Female'}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other">{t('other') || 'Other'}</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              {t('contactInformation') || 'Contact Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="mobile_number" className="text-sm font-medium">
                  {t('mobileNumber') || 'Mobile Number'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mobile_number"
                  value={formData.mobile_number}
                  onChange={(e) => handleChange('mobile_number', e.target.value)}
                  placeholder={t('mobileNumberPlaceholder') || 'Enter mobile number'}
                  className={`mt-1 ${errors.mobile_number ? 'border-red-500' : ''}`}
                />
                {errors.mobile_number && (
                  <p className="text-red-500 text-sm mt-1">{errors.mobile_number}</p>
                )}
              </div>

              <div>
                <Label htmlFor="additional_mobile_number" className="text-sm font-medium">
                  {t('additionalMobileNumber') || 'Additional Mobile Number'}
                </Label>
                <Input
                  id="additional_mobile_number"
                  value={formData.additional_mobile_number || ''}
                  onChange={(e) => handleChange('additional_mobile_number', e.target.value)}
                  placeholder={t('additionalMobileNumberPlaceholder') || 'Enter additional mobile number'}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  {t('email') || 'Email'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder={t('emailPlaceholder') || 'Enter email address'}
                  className={`mt-1 ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="alternative_contact" className="text-sm font-medium">
                  {t('alternativeContact') || 'Alternative Contact'}
                </Label>
                <Input
                  id="alternative_contact"
                  value={formData.alternative_contact || ''}
                  onChange={(e) => handleChange('alternative_contact', e.target.value)}
                  placeholder={t('alternativeContactPlaceholder') || 'Enter alternative contact'}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IdCard className="h-5 w-5" />
              {t('identification') || 'Identification'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium">
                  {t('idType') || 'ID Type'}
                </Label>
                <Select value={formData.id_type_id} onValueChange={(value) => handleChange('id_type_id', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('selectIdType') || 'Select ID type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {idTypes.filter(type => type.id && type.id.trim() !== '').map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="national_id" className="text-sm font-medium">
                  {idFieldLabel}
                </Label>
                <Input
                  id="national_id"
                  value={formData.national_id}
                  onChange={(e) => handleChange('national_id', e.target.value)}
                  placeholder={idFieldPlaceholder}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">
                  {t('country') || 'Country'}
                </Label>
                <Input
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="mt-1"
                  disabled
                />
              </div>

              <div className="relative" ref={cityDropdownRef}>
                <Label className="text-sm font-medium">
                  {t('city') || 'City'}
                </Label>
                <div className="relative">
                  <Input
                    value={citySearchQuery}
                    onChange={(e) => handleCitySearchChange(e.target.value)}
                    onFocus={() => setIsCityDropdownOpen(true)}
                    placeholder={t('selectCity') || 'Search and select city...'}
                    className="w-full mt-1"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                
                {/* City Dropdown */}
                {isCityDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredCities.length > 0 ? (
                      filteredCities.map((city) => (
                        <div
                          key={city.id}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                          onClick={() => handleCitySelect(city)}
                        >
                          <div>
                            <div className="font-medium">{city.name_en}</div>
                            {city.name_ar && (
                              <div className="text-sm text-gray-500">{city.name_ar}</div>
                            )}
                          </div>
                          {formData.city_id === city.id && (
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-sm">
                        {t('noCitiesFound') || 'No cities found'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="address" className="text-sm font-medium">
                {t('address') || 'Address'}
              </Label>
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder={t('addressPlaceholder') || 'Enter full address'}
                rows={3}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('additionalInformation') || 'Additional Information'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  {t('riskLevel') || 'Risk Level'}
                </Label>
                <RadioGroup
                  value={formData.risk_level}
                  onValueChange={(value) => handleChange('risk_level', value)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="risk_low" />
                    <Label htmlFor="risk_low">{t('low') || 'Low'}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="risk_medium" />
                    <Label htmlFor="risk_medium">{t('medium') || 'Medium'}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="risk_high" />
                    <Label htmlFor="risk_high">{t('high') || 'High'}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="critical" id="risk_critical" />
                    <Label htmlFor="risk_critical">{t('critical') || 'Critical'}</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div>
              <Label htmlFor="medical_condition" className="text-sm font-medium">
                {t('medicalCondition') || 'Medical Condition'}
              </Label>
              <Input
                id="medical_condition"
                value={formData.medical_condition || ''}
                onChange={(e) => handleChange('medical_condition', e.target.value)}
                placeholder={t('medicalConditionPlaceholder') || 'Enter medical condition if any'}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-sm font-medium">
                {t('notes') || 'Notes'}
              </Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder={t('notesPlaceholder') || 'Additional information about the beneficiary'}
                rows={4}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/beneficiaries')}
            disabled={isSubmitting}
          >
            {t('cancel') || 'Cancel'}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('creating') || 'Creating...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('createBeneficiary') || 'Create Beneficiary'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
