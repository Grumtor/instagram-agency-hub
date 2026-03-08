declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      name: string;
    };
    workspace?: {
      id: string;
      name: string;
    };
    workspaceMember?: {
      id: string;
      role: string;
    };
  }
}
