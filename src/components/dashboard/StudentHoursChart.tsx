import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardProps } from "./ServerPageComp";

interface Props {
  HoursByStudent: dashboardProps[],
}

const StudentHoursChart = ({ HoursByStudent }: Props) => {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Réservations de vol par élèves</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={HoursByStudent}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="hours" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default StudentHoursChart;
