let handler: any;

export default async function (req: any, res: any) {
  if (!handler) {
    try {
      const serverModule = await import('../server.js');
      handler = serverModule.default;
    } catch (error: any) {
      console.error("Initialization error:", error);
      return res.status(500).json({ 
        error: "Server Initialization Failed", 
        message: error.message, 
        stack: error.stack 
      });
    }
  }
  return handler(req, res);
}

