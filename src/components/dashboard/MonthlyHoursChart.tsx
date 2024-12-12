import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';
import { dashboardProps } from "@/app/(protected)/dashboard/page";

interface Props {
  HoursByMonth: dashboardProps[],
}

const MonthlyHoursChart = ({ HoursByMonth }: Props) => {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Heures de vol par mois</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={HoursByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="hours" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>

        </ResponsiveContainer>

      </CardContent>
    </Card>
  );
};

export default MonthlyHoursChart;
