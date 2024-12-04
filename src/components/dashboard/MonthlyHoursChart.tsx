import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { month: 'Jan', hours: 50 },
  { month: 'Fév', hours: 60 },
  { month: 'Mar', hours: 75 },
  { month: 'Avr', hours: 90 },
  { month: 'Mai', hours: 110 },
]

const MonthlyHoursChart: FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Heures de vol par mois</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="hours" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default MonthlyHoursChart

