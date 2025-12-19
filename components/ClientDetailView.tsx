

import React from 'react';
import { Client } from '../types.ts';

interface ClientDetailViewProps {
  client: Client;
  onBack: () => void;
}

const ClientDetailView: React.FC<ClientDetailViewProps> = ({ client, onBack }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <button onClick={onBack} className="mb-4 bg-gray-200 px-4 py-2 rounded">
        &larr; Înapoi la listă
      </button>
      <h2 className="text-2xl font-bold">{client.name}</h2>
      <p>Telefon: {client.phone}</p>
      <p>Email: {client.email}</p>
      <p>Total Cheltuit: {client.totalSpent.toFixed(2)} RON</p>
      <p>Puncte Loialitate: {client.loyaltyPoints}</p>
      <p>Nivel Loialitate: {client.loyaltyTier}</p>
      
      <h3 className="text-xl font-bold mt-6">Istoric Devize</h3>
      <ul className="mt-4 space-y-2">
        {client.estimates.map(estimate => (
          <li key={estimate.id} className="p-2 border rounded">
            {estimate.estimateNumber} - {new Date(estimate.date).toLocaleDateString('ro-RO')} - Status: {estimate.status}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClientDetailView;