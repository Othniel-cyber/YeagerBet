// api/withdraw.js

export default async function handler(req, res) {
    // 1. Autoriser uniquement les requêtes POST (sécurité)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée. Utilisez POST.' });
    }

    // 2. Récupérer les données envoyées par ton formulaire HTML
    const { phone, amount, network } = req.body;

    // 3. Récupérer ta clé privée Kkiapay cachée en sécurité sur le serveur
    const PRIVATE_KEY = process.env.KKIAPAY_PRIVATE_KEY; 

    if (!PRIVATE_KEY) {
        return res.status(500).json({ error: 'Configuration serveur manquante : Clé privée introuvable.' });
    }

    try {
        // 4. Lancer l'appel officiel de Décaissement (Payout) à Kkiapay
        const response = await fetch('https://api.kkiapay.me/api/v1/payout', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Secret-Key': PRIVATE_KEY
            },
            body: JSON.stringify({
                amount: parseInt(amount),
                destination: phone,
                service: network.toUpperCase() // Convertit en MTN, MOOV ou CELTIIS
            })
        });

        const data = await response.json();

        // 5. Renvoyer la réponse de Kkiapay à ton site front-end
        if (response.ok) {
            return res.status(200).json({ success: true, message: 'Retrait automatique validé !', data });
        } else {
            return res.status(response.status).json({ success: false, error: data.message || 'Erreur Kkiapay' });
        }

    } catch (error) {
        return res.status(500).json({ success: false, error: 'Erreur réseau ou serveur.' });
    }
}