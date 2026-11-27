param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$project = 'duonest-38dc2'
$serviceName = 'duonest-api'
$email = "$serviceName@$project.iam.gserviceaccount.com"
$roleName = 'duonestApiRuntime'
$role = "projects/$project/roles/$roleName"
$member = "serviceAccount:$email"
$permissions = @(
  'cloudconfig.configs.get',
  'cloudconfig.configs.update',
  'cloudmessaging.messages.create',
  'firebaseauth.users.createSession',
  'firebaseauth.users.get',
  'firebaseauth.users.sendEmail',
  'firebasedatabase.instances.get',
  'firebasedatabase.instances.update',
  'resourcemanager.projects.get'
) -join ','

if (!$Apply) {
  Write-Output "Projekt $project. Konto wykonawcze $email. Rola niestandardowa $role."
  Write-Output 'Run with -Apply to provision this account and its permissions.'
  exit 0
}

function Invoke-Gcloud([string[]]$Arguments) {
  $cli = if (Get-Command gcloud.cmd -ErrorAction SilentlyContinue) { 'gcloud.cmd' } else { 'gcloud' }
  & $cli @Arguments --project=$project --quiet
  if ($LASTEXITCODE -ne 0) { throw "gcloud exited with code $LASTEXITCODE." }
}

$accounts = Invoke-Gcloud @('iam','service-accounts','list','--format=value(email)')
if ($accounts -notcontains $email) {
  Invoke-Gcloud @('iam','service-accounts','create',$serviceName,'--display-name=DuoNest API')
}
$roles = Invoke-Gcloud @('iam','roles','list','--format=value(name)')
$verb = if ($roles -contains $role) { 'update' } else { 'create' }
Invoke-Gcloud @('iam','roles',$verb,$roleName,'--title=DuoNest API runtime',"--permissions=$permissions",'--stage=GA')
Invoke-Gcloud @('projects','add-iam-policy-binding',$project,"--member=$member","--role=$role",'--condition=None','--format=none')
Invoke-Gcloud @('projects','add-iam-policy-binding',$project,"--member=$member",'--role=roles/datastore.user','--condition=None','--format=none')
Invoke-Gcloud @('storage','buckets','add-iam-policy-binding',"gs://$project.firebasestorage.app","--member=$member",'--role=roles/storage.objectUser','--format=none')
foreach ($secret in @('APNS_KEY_PRODUCTION','APNS_KEY_SANDBOX','RESEND_API_KEY')) {
  Invoke-Gcloud @('secrets','add-iam-policy-binding',$secret,"--member=$member",'--role=roles/secretmanager.secretAccessor','--condition=None','--format=none')
}
