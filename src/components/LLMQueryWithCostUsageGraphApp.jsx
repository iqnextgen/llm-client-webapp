import React, { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const API_URL = "http://127.0.0.1:3000/LLMCostInquery"; // Replace with AWS Lambda API

const LLMQueryWithGraph = () => {
  const [inputText, setInputText] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [costData, setCostData] = useState([]);
  const [loadingCost, setLoadingCost] = useState(false);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const inputCost = payload.find((p) => p.dataKey === "inputCost")?.value || 0;
      const outputCost = payload.find((p) => p.dataKey === "outputCost")?.value || 0;
      const totalCost = inputCost + outputCost;
      const inputToken = (inputCost / 0.0008) * 1000;
      const outputToken = (outputCost / 0.004) * 1000; 
  
      return (
        <div style={{
          backgroundColor: "#444444", // Slightly lighter than legend colors
          color: "#FFFFFF",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)"
        }}>
          <p className="font-semibold">{`Date: ${payload[0].payload.date}`}</p>
          <p style={{ color: "#4CAF50" }}>{`Input Cost: $${inputCost.toFixed(4)}`}</p>
          <p style={{ color: "#FF5733" }}>{`Output Cost: $${outputCost.toFixed(4)}`}</p>
          <p className="font-bold">{`Total Cost: $${totalCost.toFixed(4)}`}</p>
          <p className="font-bold">{`Input Token: ${inputToken.toFixed(0)}`}</p>
          <p className="font-bold">{`Output Token: ${outputToken.toFixed(0)}`}</p>
        </div>
      );
    }
    return null;
  };

  const formatText = (text) => {
    if (!text) return "no text";
  
    return text
      .split("\n") // Preserve existing line breaks
      .map((line) =>
        line.match(/(.{1,70})(?:\s|$)/g)?.join("\n") || line
      )
      .join("\n");
  };


  const handleSubmit = async () => {
    setLoading(true);
    setResponse("");
    try {
      await fetch(API_URL, {
        method: "OPTIONS",
        headers: { "Content-Type": "application/json" },
      });

      const res = await axios.post(
        API_URL,
        { input_text: inputText },
        { headers: { "Content-Type": "application/json" } }
      );
      console.log(res.data);
      setResponse(formatText(res.data?.response || "No response received"));
      const formattedData = res.data?.cost.reduce((acc, entry) => {
          const existingEntry = acc.find(item => item.date === entry.date);
          if (existingEntry) {
              if (entry.metric.includes("USW2-MP:USW2_InputTokenCount-Units")) existingEntry.inputCost = entry.cost;
              if (entry.metric.includes("USW2-MP:USW2_OutputTokenCount-Units")) existingEntry.outputCost = entry.cost;
          } else {
              acc.push({
                  date: entry.date,
                  inputCost: entry.metric.includes("USW2-MP:USW2_InputTokenCount-Units") ? entry.cost : 0,
                  outputCost: entry.metric.includes("USW2-MP:USW2_OutputTokenCount-Units") ? entry.cost : 0
              });
          }
          return acc;
        }, []);
    
    setCostData(formattedData);
    
    } catch (error) {
      setResponse(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", textAlign: "center" }}>
      {/* Header */}
      <h2 className="text-2xl font-semibold text-center mb-4">LLM Query & Bedrock Cost Analysis</h2>

      {/* Query Input Box */}
      <textarea
        placeholder="Enter your query..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: "10px" }}
      />

      {/* Submit Button */}
      <br />
      <button onClick={handleSubmit} disabled={loading} style={{ marginTop: "10px" }}>
        {loading ? "Querying..." : "Submit"}
      </button>
      <pre style={{ textAlign: "left", background: "#f4f4f4", padding: "10px", marginTop: "20px" }}>
        {response || "Response will appear here..."}
      </pre>

      {/* Bedrock Cost Graph Section */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold text-center mb-3">Bedrock LLM Cost Over Time</h3>
        {loadingCost ? (
          <p className="text-center text-gray-500">Loading cost data...</p>
        ) : costData.length > 0 ? (
          <><ResponsiveContainer width="100%" height={400}>
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                {/* <Line type="monotone" dataKey="cost" stroke="#8884d8" strokeWidth={2} /> */}
                {/* <Bar dataKey="cost" fill="#4CAF50" barSize={50} /> */}
                {/* Output Tokens Cost (stacked on top) */}
                <Bar dataKey="outputCost" stackId="a" fill="#FF5733" name="Output Token Cost" />
                {/* Input Tokens Cost (bottom of bar) */}
                <Bar dataKey="inputCost" stackId="a" fill="#4CAF50" name="Input Token Cost" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6">
                <h3 className="text-xl font-semibold text-center mb-3">Cost Data Table</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="border border-gray-300 px-4 py-2">Date</th>
                        <th className="border border-gray-300 px-4 py-2 text-green-600">Input Token</th>
                        <th className="border border-gray-300 px-4 py-2 text-red-600">Input Cost ($) (token / 1000) x 0.0008</th>
                        <th className="border border-gray-300 px-4 py-2 text-green-600">Output Token</th>
                        <th className="border border-gray-300 px-4 py-2 text-red-600">Output Cost ($ (token / 1000) x 0.004)</th>
                        <th className="border border-gray-300 px-4 py-2 font-bold">Total Cost ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costData.map((item, index) => (

                        <tr key={index} className="text-center">
                          <td className="border border-gray-300 px-4 py-2">{item.date}</td>
                          <td className="border border-gray-300 px-4 py-2 text-green-600">{Math.round((item.inputCost/ 0.0008) * 1000)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-red-600">{item.inputCost.toFixed(4)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-green-600">{Math.round((item.outputCost/ 0.004) * 1000)}</td>
                          <td className="border border-gray-300 px-4 py-2 text-red-600">{item.outputCost.toFixed(4)}</td>
                          <td className="border border-gray-300 px-4 py-2 font-bold">{(item.inputCost + item.outputCost).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </>  
              
        ) : (
          <p className="text-center text-gray-500">No cost data available.</p>
        )}
      </div>
    </div>
  );
};

export default LLMQueryWithGraph;
