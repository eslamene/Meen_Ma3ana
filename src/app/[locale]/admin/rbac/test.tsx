'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function RBACTest() {
  const [activeTab, setActiveTab] = useState('roles')

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">RBAC Test</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Component Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={() => alert('Button works!')}>
              Test Button
            </Button>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="roles">Roles</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="roles">
                <p>Roles tab content</p>
              </TabsContent>
              
              <TabsContent value="permissions">
                <p>Permissions tab content</p>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
