import React, { useState, useEffect } from 'react';
import './StockData.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Papa from 'papaparse';
import { useParams } from 'react-router-dom';
import { fetchPredictions } from './PredictionModel';

const StockData = () => {
    const [data, setData] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [filter, setFilter] = useState('7 days');
    const [currentPrice, setCurrentPrice] = useState(0);
    const [percentageChange, setPercentageChange] = useState(0);

    const { stockSymbol } = useParams();

    useEffect(() => {
        const loadPredictions = async (lastPrice) => {
            const predictionData = await fetchPredictions(stockSymbol);
            if (predictionData && predictionData.length > 0) {
                const predictionsWithPercentage = predictionData.map(prediction => ({
                    ...prediction,
                    percentageChange: lastPrice !== 0 ? ((prediction.predictedPrice - lastPrice) / lastPrice) * 100 : 0
                }));
                setPredictions(predictionsWithPercentage);
            }
        };

        Papa.parse(`${process.env.PUBLIC_URL}/Data/${stockSymbol}.csv`, {
            download: true,
            header: true,
            complete: (result) => {
                const now = new Date();
                let startDate;
                switch (filter) {
                    case '7 days':
                        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                        break;
                    case '1 month':
                        startDate = new Date(now.setMonth(now.getMonth() - 1));
                        break;
                    case '6 months':
                        startDate = new Date(now.setMonth(now.getMonth() - 6));
                        break;
                    case '1 year':
                        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                        break;
                    default:
                        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                }

                const filteredData = result.data.filter(row => {
                    const rowDate = new Date(row['Date']);
                    return rowDate >= startDate;
                });

                if (filteredData.length > 0) {
                    const referencePrice = parseFloat(filteredData[0]['Close']);
                    const lastPrice = parseFloat(filteredData[filteredData.length - 1]['Close']);
                    const difference = lastPrice - referencePrice;
                    const percentage = referencePrice !== 0 ? (difference / referencePrice) * 100 : 0;

                    setCurrentPrice(lastPrice);
                    setPercentageChange(percentage);

                    loadPredictions(lastPrice);
                }

                const transformedData = filteredData.map(row => ({
                    date: row['Date'],
                    price: parseFloat(row['Close'])
                }));
                setData(transformedData);
            }
        });
    }, [filter, stockSymbol]);

    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };
    return (
        <div className="stockDataContainer">
            <h2>Valeur boursière de {stockSymbol.toUpperCase()}</h2>
            <div className="filterContainer">
                <label htmlFor="time-filter">Filtrer par période :</label>
                <select id="time-filter" value={filter} onChange={handleFilterChange}>
                    <option value="7 days">7 jours</option>
                    <option value="1 month">1 mois</option>
                    <option value="6 months">6 mois</option>
                    <option value="1 year">1 an</option>
                </select>
            </div>
            <p>Valeur actuelle : ${currentPrice.toFixed(2)}
                <span style={{ color: percentageChange >= 0 ? 'green' : 'red' }}>
                    {` (${percentageChange.toFixed(2)}%)`}
                </span>
            </p>
            <div className="chartContainer">
                <LineChart
                    width={600}
                    height={300}
                    data={data}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                        domain={['dataMin', 'dataMax']}
                        width={80}
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="price" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
            </div>
            <div className="chartContainer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                <h3>Prédictions futures</h3>
                <LineChart
                    width={600}
                    height={300}
                    data={predictions}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                        width={80}
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip formatter={(value, name, props) => [`${value.toFixed(2)} (${props.payload.percentageChange.toFixed(2)}%)`, name]} />
                    <Legend />
                    <Line type="monotone" dataKey="predictedPrice" stroke="#82ca9d" activeDot={{ r: 8 }} />
                </LineChart>
            </div>
        </div>
    );
};

export default StockData;
