export default {
  async fetch(request: Request, env: any) {
      console.log("WORKER VERSION UPLOAD TEST", {
          method: request.method,
          path: new URL(request.url).pathname
        });
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

    // Hämta drinken först så vi vet vilka mediafiler som hör till den
    const drink = await env.DB
      .prepare("SELECT photo_url, video_url FROM drinks WHERE id=?")
      .bind(id)
      .first();

    if (!drink) {
      return new Response(JSON.stringify({ error: "Drink not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Ta bort eventuell bild från R2
    if (drink.photo_url) {
      await env.MEDIA.delete(drink.photo_url);
    }

    // Ta bort eventuell video från R2
    if (drink.video_url) {
      await env.MEDIA.delete(drink.video_url);
    }

    // Ta bort drinken från D1
    await env.DB
      .prepare("DELETE FROM drinks WHERE id=?")
      .bind(id)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

    // POST /upload — laddar upp en fil (video eller bild) till R2, KRÄVER nyckel
  if (url.pathname === "/upload" && request.method === "POST") {
      console.log("=== UPLOAD REQUEST RECEIVED ===", {
        filename: url.searchParams.get("filename"),
        date: url.searchParams.get("date"),
        contentType: request.headers.get("Content-Type"),
        contentLength: request.headers.get("Content-Length"),
      });
    if (!isAuthorized(request)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const filename = url.searchParams.get("filename");
    const date = url.searchParams.get("date");

    if (!filename || !date) {
      return new Response(
        JSON.stringify({ error: "Filnamn och datum krävs" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // YYYY-MM-DD → YYYYMMDD
    const datePrefix = date.replace(/-/g, "");

    // Behåll filens riktiga extension (.jpg, .heic, .mov, .mp4 osv.)
    const extension = filename.includes(".")
      ? "." + filename.split(".").pop()!.toLowerCase()
      : "";

    // Hitta första lediga filnamnet
    let counter = 0;
    let finalFilename: string;

    while (true) {
      finalFilename =
        counter === 0
          ? `${datePrefix}${extension}`
          : `${datePrefix}_${counter}${extension}`;

      const existing = await env.MEDIA.head(finalFilename);

      if (!existing) {
        break;
      }

      counter++;
    }

    console.log("R2 upload started:", {filename, date, finalFilename,});

    // Ladda upp filen
    try {
      await env.MEDIA.put(finalFilename, request.body);
      console.log("R2 upload successful:", finalFilename);

    } catch (err) {
        console.error("R2 upload failed:", {
          filename,
          finalFilename,
          date,
          error: err instanceof Error ? err.message : String(err),
        });

      return new Response(
        JSON.stringify({
          error: "Uppladdningen till lagringen misslyckades",
          details: err instanceof Error ? err.message : String(err),
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
    return new Response(
      JSON.stringify({ url: finalFilename }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  // VIDEO MULTIPART
  if (url.pathname === "/upload/start" && request.method === "POST") {
    if (!isAuthorized(request)) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"Content-Type":"application/json",...corsHeaders}});

    const filename=url.searchParams.get("filename");
    const date=url.searchParams.get("date");
    if (!filename||!date) return new Response(JSON.stringify({error:"Filnamn och datum krävs"}),{status:400,headers:{"Content-Type":"application/json",...corsHeaders}});

    const prefix=date.replace(/-/g,"");
    const ext=filename.includes(".")?"."+filename.split(".").pop()!.toLowerCase():"";
    let counter=0, key="";

    while (true) {
      key=counter===0?`${prefix}${ext}`:`${prefix}_${counter}${ext}`;
      if (!(await env.MEDIA.head(key))) break;
      counter++;
    }

    try {
      const upload=await env.MEDIA.createMultipartUpload(key,{
        httpMetadata:{contentType:filename.toLowerCase().endsWith(".mov")?"video/quicktime":"video/mp4"}
      });
      console.log("MULTIPART STARTED",{key,uploadId:upload.uploadId});
      return new Response(JSON.stringify({key,uploadId:upload.uploadId}),{status:201,headers:{"Content-Type":"application/json",...corsHeaders}});
    } catch(err) {
        console.error("MULTIPART START FAILED", {
          error: String(err),
          name: err instanceof Error ? err.name : undefined,
          message: err instanceof Error ? err.message : undefined,
          stack: err instanceof Error ? err.stack : undefined,
          key,
          filename,
          date,
        });
        return new Response(JSON.stringify({error:"Kunde inte starta videouppladdningen",details:String(err)}),{status:500,headers:{"Content-Type":"application/json",...corsHeaders}});
    }
  }

  if (url.pathname === "/upload/part" && request.method === "PUT") {
    if (!isAuthorized(request)) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"Content-Type":"application/json",...corsHeaders}});

    const key=url.searchParams.get("key");
    const uploadId=url.searchParams.get("uploadId");
    const partNumber=Number(url.searchParams.get("partNumber"));

    if (!key||!uploadId||!partNumber||!request.body) return new Response(JSON.stringify({error:"Ogiltiga upload-parametrar"}),{status:400,headers:{"Content-Type":"application/json",...corsHeaders}});

    try {
      const upload=env.MEDIA.resumeMultipartUpload(key,uploadId);
      const part=await upload.uploadPart(partNumber,request.body);
      console.log("MULTIPART PART OK",{partNumber,etag:part.etag});
      return new Response(JSON.stringify(part),{headers:{"Content-Type":"application/json",...corsHeaders}});
    } catch(err) {
      console.error("MULTIPART PART FAILED",{partNumber,error:String(err)});
      return new Response(JSON.stringify({error:"Deluppladdning misslyckades",details:String(err)}),{status:500,headers:{"Content-Type":"application/json",...corsHeaders}});
    }
  }

  if (url.pathname === "/upload/complete" && request.method === "POST") {
    if (!isAuthorized(request)) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"Content-Type":"application/json",...corsHeaders}});

    const key=url.searchParams.get("key");
    const uploadId=url.searchParams.get("uploadId");
    if (!key||!uploadId) return new Response(JSON.stringify({error:"Upload-parametrar saknas"}),{status:400,headers:{"Content-Type":"application/json",...corsHeaders}});

    try {
      const {parts}=await request.json<{parts:R2UploadedPart[]}>();
      const upload=env.MEDIA.resumeMultipartUpload(key,uploadId);
      await upload.complete(parts);

      const verified=await env.MEDIA.head(key);
      console.log("!!! MULTIPART FILE VERIFIED !!!",{
        key:verified?.key,
        size:verified?.size,
        etag:verified?.etag,
        contentType:verified?.httpMetadata?.contentType
      });

      return new Response(JSON.stringify({url:key}),{status:201,headers:{"Content-Type":"application/json",...corsHeaders}});
    } catch(err) {
      console.error("MULTIPART COMPLETE FAILED",err);
      return new Response(JSON.stringify({error:"Kunde inte slutföra videon",details:String(err)}),{status:500,headers:{"Content-Type":"application/json",...corsHeaders}});
    }
  }

  if (url.pathname === "/upload/abort" && request.method === "POST") {
    if (!isAuthorized(request)) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"Content-Type":"application/json",...corsHeaders}});

    const key=url.searchParams.get("key");
    const uploadId=url.searchParams.get("uploadId");
    if (!key||!uploadId) return new Response(JSON.stringify({error:"Upload-parametrar saknas"}),{status:400,headers:{"Content-Type":"application/json",...corsHeaders}});

    try {
      await env.MEDIA.resumeMultipartUpload(key,uploadId).abort();
      console.log("MULTIPART ABORTED",{key,uploadId});
      return new Response(null,{status:204,headers:corsHeaders});
    } catch(err) {
      console.error("MULTIPART ABORT FAILED",err);
      return new Response(JSON.stringify({error:String(err)}),{status:500,headers:{"Content-Type":"application/json",...corsHeaders}});
    }
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