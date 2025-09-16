import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Registramos los componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export interface MonthlyPerformanceData {
  months: string[];
  quotes: number[];
  ratings: number[];
}

interface PerformanceChartProps {
  stats: MonthlyPerformanceData;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ stats }) => {
  const [chartData, setChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });

  useEffect(() => {
    console.log("PerformanceChart recibió stats:", stats);
    if (stats && stats.months && stats.months.length > 0) {
      setChartData({
        labels: stats.months,
        datasets: [
          {
            label: 'Cotizaciones',
            data: stats.quotes,
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: 'rgb(53, 162, 235)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            yAxisID: 'y',
          },
          {
            label: 'Calificaciones',
            data: stats.ratings,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: 'rgb(255, 99, 132)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            yAxisID: 'y1',
          }
        ],
      });
    }
  }, [stats]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
            weight: 'bold'
          }
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        min: 0,
        suggestedMax: 20,
        title: {
          display: true,
          text: 'Cotizaciones',
          color: 'rgb(53, 162, 235)',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          precision: 0,
          font: {
            size: 10
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        min: 0,
        max: 5,
        title: {
          display: true,
          text: 'Calificaciones',
          color: 'rgb(255, 99, 132)',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: false,
        },
        ticks: {
          precision: 1,
          stepSize: 1,
          font: {
            size: 10
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12
          }
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#666',
        titleFont: {
          size: 13,
          weight: 'bold'
        },
        bodyFont: {
          size: 12
        },
        padding: 10,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label === 'Calificaciones') {
              return `${label}: ${value.toFixed(1)} ⭐`;
            }
            return `${label}: ${value}`;
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  // Verificar si realmente hay datos (no solo estructura vacía)
  const hasRealData = stats && stats.quotes && stats.quotes.some(value => value > 0);
  
  // Si no hay datos, mostramos un mensaje
  if (!stats || !stats.months || stats.months.length === 0 || !hasRealData) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 text-sm mb-1">No hay datos suficientes para mostrar el gráfico</p>
        <p className="text-gray-400 text-xs">Complete cotizaciones para ver estadísticas</p>
      </div>
    );
  }

  console.log("Renderizando gráfico con datos:", chartData);
  return (
    <div className="h-full w-full px-2">
      <Line options={options} data={chartData} />
    </div>
  );
};

export default PerformanceChart;
