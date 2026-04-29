let handler: any;

export default async function (req: any, res: any) {
  if (!handler) {
    try {
      const serverModule = await import('../server');
      handler = serverModule.default;
    } catch (error: any) {
      console.error("Initialization error:", error);
      return res.status(500).json({ 
        error: "Server Initialization Failed", 
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
      });
    }
  }
  return handler(req, res);
}

