#!/bin/bash
# Allow unauthenticated (allUsers) invoker access to Firebase callable functions.
# Required so browser CORS preflight (OPTIONS) reaches the function and returns
# CORS headers. Auth is still enforced inside each function via context.auth.
#
# Run from project root with your project and region, e.g.:
#   PROJECT_ID=ormsby-factory-standard-runs ./scripts/allow-callable-invoke.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(node -e "try {console.log(require('./.firebaserc').projects.default)} catch {console.log('')}")}"
REGION="${REGION:-us-central1}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Set PROJECT_ID or ensure .firebaserc has a default project."
  exit 1
fi

FUNCTIONS=(
  setClientRole
  setUserRole
  createUser
  getUserInfo
  listUsers
  lookupUserByEmail
  resetUserPassword
  sendTestEmails
  backupFirestore
  restoreFirestore
  listBackups
)

echo "Granting roles/cloudfunctions.invoker to allUsers for callable functions"
echo "Project: $PROJECT_ID  Region: $REGION"
echo ""

for fn in "${FUNCTIONS[@]}"; do
  echo "  $fn"
  gcloud functions add-iam-policy-binding "$fn" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --member="allUsers" \
    --role="roles/cloudfunctions.invoker" \
    --quiet
done

echo ""
echo "Done. Callable functions can now be invoked from the web app (CORS will succeed)."
