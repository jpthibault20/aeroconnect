import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { dashboardProps } from "./ServerPageComp"


interface Props {
  hoursByPlanes: dashboardProps[],
}

const AircraftHoursChart = ({ hoursByPlanes }: Props) => {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Réservations par avion</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hoursByPlanes} layout="vertical">
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

export default AircraftHoursChart

