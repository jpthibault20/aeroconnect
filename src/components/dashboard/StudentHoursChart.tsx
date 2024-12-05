import { getHoursByStudent } from "@/api/db/sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Spinner } from "../ui/SpinnerVariants";

interface Props {
  clubID: string;
}

const StudentHoursChart = ({ clubID }: Props) => {
  const [HoursByStudent, setHoursByStudent] = useState<{ student: string; hours: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Activer le loader avant de démarrer la requête
      try {
        const res = await getHoursByStudent(clubID);
        setHoursByStudent(res);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false); // Désactiver le loader une fois la requête terminée
      }
    };
    fetchData();
  }, [clubID]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Heures de vol par élèves</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {loading ? (
            <Spinner>Chargement des données...</Spinner>
          ) : (
            <BarChart data={HoursByStudent}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="student" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="hours" fill="#8884d8" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default StudentHoursChart;
