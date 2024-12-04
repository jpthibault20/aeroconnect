import { FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const data = [
  { name: 'Pierre', hours: 120 },
  { name: 'Marie', hours: 80 },
  { name: 'Jean', hours: 100 },
  { name: 'Sophie', hours: 60 },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const InstructorHoursChart: FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Heures par instructeur</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="hours"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default InstructorHoursChart

