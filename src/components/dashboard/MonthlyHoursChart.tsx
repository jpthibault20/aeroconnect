import { getHoursByMonth } from "@/api/db/sessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';
import { Spinner } from "../ui/SpinnerVariants";

interface Props {
  clubID: string;
}

const MonthlyHoursChart = ({ clubID }: Props) => {
  const [HoursByMonth, setHoursByMonth] = useState<{ month: string; hours: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Activer le loader avant de démarrer la requête
      try {
        const res = await getHoursByMonth(clubID);
        setHoursByMonth(res);
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
        <CardTitle>Heures de vol par mois</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {loading ? (
            // Afficher le loader pendant le chargement
            <Spinner></Spinner>
          ) : (
            // Afficher le graphique une fois les données chargées
            <LineChart data={HoursByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          )}
        </ResponsiveContainer>

      </CardContent>
    </Card>
  );
};

export default MonthlyHoursChart;
