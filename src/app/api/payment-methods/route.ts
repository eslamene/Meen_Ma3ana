import { NextRequest, NextResponse } from 'next/server'

// Mock payment methods data until database table is created
const MOCK_PAYMENT_METHODS = [
  {
    id: '1',
    code: 'bank_transfer',
    name: 'Bank Transfer',
    description: 'Direct bank transfer to our account',
    sort_order: 1
  },
  {
    id: '2',
    code: 'mobile_wallet',
    name: 'Mobile Wallet',
    description: 'Mobile payment through various wallet services',
    sort_order: 2
  },
  {
    id: '3',
    code: 'cash',
    name: 'Cash',
    description: 'Cash payment at our office or through representatives',
    sort_order: 3
  },
  {
    id: '4',
    code: 'check',
    name: 'Check',
    description: 'Payment by check or bank draft',
    sort_order: 4
  },
  {
    id: '5',
    code: 'ipn',
    name: 'IPN',
    description: 'Instant Payment Notification',
    sort_order: 5
  }
]

export async function GET(request: NextRequest) {
  try {
    // Return mock data for now
    return NextResponse.json({ paymentMethods: MOCK_PAYMENT_METHODS })
  } catch (error) {
    console.error('Error in payment methods API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 