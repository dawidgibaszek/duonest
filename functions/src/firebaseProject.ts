export const DUONEST_PROJECT_ID = 'duonest-38dc2'

export function databaseUrlForProject(projectId?: string) {
  return projectId === DUONEST_PROJECT_ID
    ? 'https://duonest-38dc2-default-rtdb.europe-west1.firebasedatabase.app'
    : undefined
}
