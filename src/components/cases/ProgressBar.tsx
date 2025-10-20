'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface ProgressBarProps {
  currentAmount: number
  targetAmount: number
  currency?: string
  showPercentage?: boolean
  showAmounts?: boolean
  showStatus?: boolean
  className?: string
}

export default function ProgressBar({
  currentAmount,
  targetAmount,
  currency = 'EGP',
  showPercentage = true,
  showAmounts = true,
  showStatus = true,
  className = ''
}: ProgressBarProps) {
  const t = useTranslations('cases')

  const progressPercentage = Math.min((currentAmount / targetAmount) * 100, 100)
  const isFullyFunded = currentAmount >= targetAmount
  const isOverFunded = currentAmount > targetAmount
  const isNearTarget = progressPercentage >= 90 && !isFullyFunded

  const formatAmount = (amount: number) => {
    return `EGP ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`
  }

  const getStatusInfo = () => {
    if (isOverFunded) {
      return {
        status: 'overFunded',
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'bg-green-100 text-green-800',
        message: t('overFunded')
      }
    }
    if (isFullyFunded) {
      return {
        status: 'fullyFunded',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'bg-green-100 text-green-800',
        message: t('fullyFunded')
      }
    }
    if (isNearTarget) {
      return {
        status: 'nearTarget',
        icon: <Target className="h-4 w-4" />,
        color: 'bg-yellow-100 text-yellow-800',
        message: t('nearTarget')
      }
    }
    return {
      status: 'inProgress',
      icon: <Clock className="h-4 w-4" />,
      color: 'bg-blue-100 text-blue-800',
      message: t('inProgress')
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('fundingProgress')}</CardTitle>
          {showStatus && (
            <Badge variant="secondary" className={statusInfo.color}>
              {statusInfo.icon}
              <span className="ml-1">{statusInfo.message}</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            {showAmounts && (
              <>
                <span>{formatAmount(currentAmount)}</span>
                <span>{formatAmount(targetAmount)}</span>
              </>
            )}
            {showPercentage && (
              <span className="font-medium">
                {progressPercentage.toFixed(1)}%
              </span>
            )}
          </div>
          
          <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ease-out ${
                isOverFunded 
                  ? 'bg-green-500' 
                  : isFullyFunded 
                    ? 'bg-green-500' 
                    : isNearTarget 
                      ? 'bg-yellow-500' 
                      : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
            
            {/* Progress indicator dots */}
            {progressPercentage > 0 && progressPercentage < 100 && (
              <div className="absolute top-0 left-0 h-3 w-3 bg-white rounded-full shadow-sm transform -translate-x-1/2" />
            )}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {progressPercentage.toFixed(1)}%
            </div>
            <div className="text-gray-600">{t('complete')}</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatAmount(currentAmount)}
            </div>
            <div className="text-gray-600">{t('raised')}</div>
          </div>
        </div>

        {/* Remaining Amount */}
        {!isFullyFunded && (
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-lg font-semibold text-blue-800">
              {formatAmount(targetAmount - currentAmount)}
            </div>
            <div className="text-sm text-blue-600">{t('stillNeeded')}</div>
          </div>
        )}

        {/* Over-funded Warning */}
        {isOverFunded && (
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-center gap-2 text-yellow-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {t('overFundedWarning', { 
                  amount: formatAmount(currentAmount - targetAmount) 
                })}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 