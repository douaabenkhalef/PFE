import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

function App() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/items/`);
      setItems(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Erreur de chargement des données. Vérifiez que le backend est démarré sur http://localhost:8000');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.description) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/items/`, newItem);
      setItems([response.data, ...items]);
      setNewItem({ name: '', description: '' });
      setError('');
    } catch (error) {
      console.error('Error creating item:', error);
      setError('Erreur lors de la création');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet item ?')) {
      try {
        await axios.delete(`${API_URL}/items/${id}/`);
        setItems(items.filter(item => item.id !== id));
      } catch (error) {
        console.error('Error deleting item:', error);
        setError('Erreur lors de la suppression');
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-5xl font-bold text-center text-gray-800 mb-2">
          PFE Project
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Django + MongoDB + React + Tailwind CSS
        </p>

        {error && (
          <div className="max-w-md mx-auto mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
            <p className="font-bold">Erreur</p>
            <p>{error}</p>
          </div>
        )}

        {/* Formulaire d'ajout */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">Ajouter un nouvel item</h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Nom
            </label>
            <input
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="Entrez le nom"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Description
            </label>
            <textarea
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              rows="3"
              placeholder="Entrez la description"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 transform hover:scale-[1.02]"
          >
            Ajouter
          </button>
        </form>

        {/* Liste des items */}
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">
          Liste des items ({items.length})
        </h2>
        
        {loading ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="text-gray-600 mt-2">Chargement...</p>
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-500">Aucun item trouvé. Créez votre premier item !</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-gray-400 hover:text-red-600 font-bold text-xl transition"
                    title="Supprimer"
                  >
                    ×
                  </button>
                </div>
                <p className="text-gray-600 mb-4">{item.description}</p>
                <div className="text-sm text-gray-400">
                  Créé le: {formatDate(item.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
