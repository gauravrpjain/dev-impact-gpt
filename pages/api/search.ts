import { supabaseAdmin } from "@/utils";
import { match } from "assert";

export const config = {
  runtime: "edge"
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const {query} = (await req.json()) as { query:string };

    const input = query.replace(/\n/g, " ");

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`
      },
      method: "POST",
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: query
      })
    });

    const json = await response.json();
    const embedding = json.data[0].embedding;

    const { data: chunks, error } = await supabaseAdmin.rpc("dev_impt_search", {
      query_embedding: embedding,
      similarity_threshold: 0.5,
      match_count: 5
    });

    if (error) {
      console.error(error);
      return new Response("Error", { status: 500 });
    }

    return new Response(JSON.stringify(chunks), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Error", { status: 500 });
  }
};

export default handler;
