import { getHoursByPlane } from "@/api/db/sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Spinner } from "../ui/SpinnerVariants";

interface Props {
  clubID: string;
}

const AircraftHoursChart = ({ clubID }: Props) => {
  const [HoursByPlane, setHoursByPlane] = useState<{ aircraft: string; hours: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Activer le loader avant de démarrer la requête
      try {
        const res = await getHoursByPlane(clubID);
        setHoursByPlane(res);
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
        <CardTitle>Heures par avion</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {loading ? (
            <Spinner>Chargement des données...</Spinner>
          ) : (
            <BarChart data={HoursByPlane} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="aircraft" type="category" />
              <Tooltip />
              <Bar dataKey="hours" fill="#82ca9d" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default AircraftHoursChart

