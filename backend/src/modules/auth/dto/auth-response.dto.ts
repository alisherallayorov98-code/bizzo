export class AuthResponseDto {
  accessToken: string;
  user: {
    id:          string;
    email:       string;
    firstName:   string;
    lastName:    string;
    role:        string;
    permissions: Record<string, boolean>;
    company: {
      id:      string;
      name:    string;
      logo:    string | null;
      plan:    string;
      modules: string[];
    };
  };
}
