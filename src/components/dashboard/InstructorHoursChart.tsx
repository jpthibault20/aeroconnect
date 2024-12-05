import { getHoursByInstructor } from "@/api/db/sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react";
import { ResponsiveContainer, Tooltip, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts'
import { Spinner } from "../ui/SpinnerVariants";

interface Props {
  clubID: string;
}


const InstructorHoursChart = ({ clubID }: Props) => {
  const [loading, setLoading] = useState(false);
  const [HoursByInstructor, setHoursByInstructor] = useState<{ name: string; hours: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Activer le loader avant de démarrer la requête
      try {
        const res = await getHoursByInstructor(clubID);
        setHoursByInstructor(res);
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
        <CardTitle>Heures par instructeur</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {loading ? (
            <Spinner>Chargement des données...</Spinner>
          ) : (
            <BarChart data={HoursByInstructor} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Bar dataKey="hours" fill="#82ca9d" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default InstructorHoursChart


