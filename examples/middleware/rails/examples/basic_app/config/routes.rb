Rails.application.routes.draw do
  post "/refunds", to: "refunds#create"
end
