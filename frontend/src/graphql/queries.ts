import { gql } from 'graphql-request';

export const GET_CAMPAIGNS = gql`
  query GetCampaigns {
    campaigns {
      id
      name
      description
      summary
    }
  }
`;

export const GET_CAMPAIGN_DASHBOARD = gql`
  query GetCampaignDashboard($id: Int!) {
    campaign(id: $id) {
      id
      name
      description
      summary
      sessions {
        id
        name
        status
        summary
        created_at
      }
      personas {
        id
        name
        role
        description
        voice_description
        summary
        player_name
        gender
        race
        class_name
        level
        status
        faction
        alignment
        aliases
      }
      moments {
        id
        title
        description
        type
        session_id
        session_name
      }
    }
  }
`;

export const GET_CAMPAIGN_PERSONAS = gql`
  query GetCampaignPersonas($id: Int!) {
    campaign(id: $id) {
      id
      name
      personas {
        id
        name
        role
        description
        voice_description
        summary
        player_name
        gender
        race
        class_name
        level
        status
        faction
        alignment
        aliases
        highlights {
            id
            text
            name
            type
        }
        quotes {
            id
            text
            speaker_name
        }
      }
    }
  }
`;

export const GET_SESSION_DETAILS = gql`
  query GetSessionDetails($id: Int!) {
    session(id: $id) {
      id
      name
      status
      summary
      created_at
      campaign_id
      highlights {
        id
        text
        name
        type
        persona_id
      }
      quotes {
        id
        text
        speaker_name
        persona_id
      }
    }
  }
`;

export const GET_PERSONA_DETAILS = gql`
  query GetPersonaDetails($id: Int!) {
    persona(id: $id) {
      id
      name
      role
      description
      voice_description
      summary
      player_name
      gender
      race
      class_name
      level
      status
      faction
      alignment
      aliases
      highlights {
        id
        text
        name
        type
        session_id
      }
      quotes {
        id
        text
        speaker_name
        session_id
      }
    }
  }
`;

export const UPDATE_PERSONA = gql`
  mutation UpdatePersona($id: Int!, $input: PersonaInput!) {
    update_persona(id: $id, input: $input) {
      id
      name
      aliases
    }
  }
`;
