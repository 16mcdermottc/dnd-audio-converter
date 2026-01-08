import { gql } from 'graphql-request';

export const CREATE_CAMPAIGN = gql`
  mutation CreateCampaign($name: String!, $description: String) {
    create_campaign(name: $name, description: $description) {
      id
      name
      description
    }
  }
`;

export const DELETE_CAMPAIGN = gql`
  mutation DeleteCampaign($id: Int!) {
    delete_campaign(id: $id)
  }
`;

export const GENERATE_CAMPAIGN_SUMMARY = gql`
  mutation GenerateCampaignSummary($id: Int!) {
    generate_campaign_summary(id: $id)
  }
`;

export const DELETE_SESSION = gql`
  mutation DeleteSession($id: Int!) {
    delete_session(id: $id)
  }
`;

export const UPDATE_SESSION = gql`
  mutation UpdateSession($id: Int!, $name: String, $summary: String) {
    update_session(id: $id, name: $name, summary: $summary) {
      id
      name
      summary
    }
  }
`;

export const REFINE_SESSION_SUMMARY = gql`
  mutation RefineSessionSummary($id: Int!) {
    refine_session_summary(id: $id)
  }
`;

export const CREATE_PERSONA = gql`
  mutation CreatePersona($input: PersonaInput!) {
    create_persona(input: $input) {
      id
      name
      role
      description
      voice_description
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
  }
`;

export const UPDATE_PERSONA = gql`
  mutation UpdatePersona($id: Int!, $input: PersonaInput!) {
    update_persona(id: $id, input: $input) {
      id
      name
      role
      description
      voice_description
      player_name
      gender
      race
      class_name
      level
      status
      faction
      alignment
      aliases
      summary
    }
  }
`;

export const DELETE_PERSONA = gql`
  mutation DeletePersona($id: Int!) {
    delete_persona(id: $id)
  }
`;

export const MERGE_PERSONAS = gql`
  mutation MergePersonas($targetId: Int!, $sourceId: Int!) {
    merge_personas(target_id: $targetId, source_id: $sourceId) {
      id
      name
      highlights {
        id
        text
      }
      quotes {
        id
        text
      }
    }
  }
`;

export const UPDATE_HIGHLIGHT = gql`
  mutation UpdateHighlight($id: Int!, $input: HighlightInput!) {
    update_highlight(id: $id, input: $input) {
      id
      text
      type
      persona_id
    }
  }
`;

export const DELETE_HIGHLIGHT = gql`
  mutation DeleteHighlight($id: Int!) {
    delete_highlight(id: $id)
  }
`;

export const UPDATE_QUOTE = gql`
  mutation UpdateQuote($id: Int!, $input: QuoteInput!) {
    update_quote(id: $id, input: $input) {
      id
      text
      speaker_name
      persona_id
    }
  }
`;

export const DELETE_QUOTE = gql`
  mutation DeleteQuote($id: Int!) {
    delete_quote(id: $id)
  }
`;
