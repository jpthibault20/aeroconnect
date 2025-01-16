import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts'
import { dashboardProps } from "./ServerPageComp"

interface Props {
  HoursByInstructor: dashboardProps[],
}


const InstructorHoursChart = ({ HoursByInstructor }: Props) => {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Réservations par instructeur</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={HoursByInstructor} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" />
            <Tooltip />
            <Bar dataKey="hours" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default InstructorHoursChart


