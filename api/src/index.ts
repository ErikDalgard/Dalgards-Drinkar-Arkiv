export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Kontrollerar att requesten har rätt hemlig nyckel i headern.
    // Används bara av skriv-routes (POST/PUT/DELETE) — GET förblir öppen.
    function isAuthorized(req: Request): boolean {
      const providedKey = req.headers.get("X-Admin-Key");
      return providedKey === env.ADMIN_KEY;
    }

    // GET /drinks — hämta alla, publik, ingen nyckel krävs
    if (url.pathname === "/drinks" && request.method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM drinks ORDER BY date DESC"
      ).all();
      const drinks = results.map(rowToDrink);
      return new Response(JSON.stringify(drinks), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // POST /drinks — skapa ny drink, KRÄVER nyckel
    if (url.pathname === "/drinks" && request.method === "POST") {
      if (!isAuthorized(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const body: any = await request.json();
      const result = await env.DB.prepare(
        `INSERT INTO drinks (date, theme, drink, video_url, photo_url, note, ingredients, steps, taste)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        body.date, body.theme || "", body.drink, body.url,
        body.photo || "", body.note || "", body.ingredients || "",
        body.steps || "", body.taste || ""
      ).run();

      return new Response(JSON.stringify({ id: result.meta.last_row_id }), {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // PUT /drinks/:id — uppdatera, KRÄVER nyckel
    const putMatch = url.pathname.match(/^\/drinks\/(\d+)$/);
    if (putMatch && request.method === "PUT") {
      if (!isAuthorized(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const id = putMatch[1];
      const body: any = await request.json();
      await env.DB.prepare(
        `UPDATE drinks SET date=?, theme=?, drink=?, video_url=?, photo_url=?,
         note=?, ingredients=?, steps=?, taste=? WHERE id=?`
      ).bind(
        body.date, body.theme || "", body.drink, body.url,
        body.photo || "", body.note || "", body.ingredients || "",
        body.steps || "", body.taste || "", id
      ).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // DELETE /drinks/:id — ta bort, KRÄVER nyckel
    const deleteMatch = url.pathname.match(/^\/drinks\/(\d+)$/);
    if (deleteMatch && request.method === "DELETE") {
      if (!isAuthorized(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const id = deleteMatch[1];
      await env.DB.prepare("DELETE FROM drinks WHERE id=?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

	// POST /upload — laddar upp en fil (video eller bild) till R2, KRÄVER nyckel
	if (url.pathname === "/upload" && request.method === "POST") {
		if (!isAuthorized(request)) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}

		const filename = url.searchParams.get("filename");
		if (!filename) {
			return new Response(JSON.stringify({ error: "Filnamn saknas i ?filename=" }), {
			status: 400,
			headers: { "Content-Type": "application/json", ...corsHeaders },
			});
		}

		// request.body är själva fil-bytesen, skickade rakt av (inte JSON)
		await env.MEDIA.put(filename, request.body);

		const publicUrl = filename;
		return new Response(JSON.stringify({ url: publicUrl }), {
			status: 201,
			headers: { "Content-Type": "application/json", ...corsHeaders },
	});
	}

      // POST /admin/verify — validera om nyckeln är rätt
    if (url.pathname === "/admin/verify" && request.method === "POST") {
      if (!isAuthorized(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }




    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};

function rowToDrink(row: any) {
  return {
    id: row.id,
    date: row.date,
    theme: row.theme || "",
    drink: row.drink,
    url: row.video_url,
    photo: row.photo_url || "",
    note: row.note || "",
    ingredients: row.ingredients || "",
    steps: row.steps || "",
    taste: row.taste || "",
  };
}