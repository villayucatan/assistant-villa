import express from "express";
import cors from "cors";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // Permet de lire les requêtes avec le corps en JSON

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let threads = {};

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    // Crée un thread pour l'utilisateur
    const user_id = "client"; // Identifiant utilisateur, peut être modifié si nécessaire
    if (!threads[user_id]) {
      const thread = await openai.beta.threads.create();
      threads[user_id] = thread.id;
    }

    // Envoie le message dans le thread
    await openai.beta.threads.messages.create({
      thread_id: threads[user_id],
      role: "user",
      content: message,
    });

    // Démarre l'assistant
    const run = await openai.beta.threads.runs.create({
      thread_id: threads[user_id],
      assistant_id: process.env.ASSISTANT_ID,
    });

    let status;
    do {
      const currentRun = await openai.beta.threads.runs.retrieve(threads[user_id], run.id);
      status = currentRun.status;
      if (status !== "completed") await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (status !== "completed");

    // Récupère la réponse de l'assistant
    const messages = await openai.beta.threads.messages.list({ thread_id: threads[user_id] });
    const lastMessage = messages.data.find((msg) => msg.role === "assistant");

    res.json({ reply: lastMessage.content[0].text.value });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur serveur");
  }
});

// Définir un port d'écoute
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur backend lancé sur le port ${PORT}`);
});

