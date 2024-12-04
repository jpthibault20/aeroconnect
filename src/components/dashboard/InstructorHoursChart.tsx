import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { COLORS } from "@/config/configClub";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface Props {
  HoursByInstructor: { name: string; hours: number }[];
}


const InstructorHoursChart = ({ HoursByInstructor }: Props) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Heures par instructeur</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={HoursByInstructor}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="hours"
            >
              {HoursByInstructor.map((entry, index) => (
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

