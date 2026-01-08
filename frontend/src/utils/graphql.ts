import { GraphQLClient } from 'graphql-request';

const API_URL = 'http://localhost:8000/graphql';

export const graphQLClient = new GraphQLClient(API_URL, {
  headers: {
    // Add auth headers if needed
  },
});

export const request = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    return graphQLClient.request<T>(query, variables);
};
