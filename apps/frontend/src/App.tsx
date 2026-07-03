import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./services/api/queryClient";
import { AppRouter } from "./router/AppRouter";

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
};

export default App;
