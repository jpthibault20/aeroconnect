import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { aircraft: 'F-ABCD', hours: 150 },
  { aircraft: 'F-EFGH', hours: 120 },
  { aircraft: 'F-IJKL', hours: 100 },
  { aircraft: 'F-MNOP', hours: 80 },
]

const AircraftHoursChart: FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Heures par avion</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="aircraft" type="category" />
            <Tooltip />
            <Bar dataKey="hours" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default AircraftHoursChart

