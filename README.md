### Cerve Stimulus Starter

This repository is use for testing out how an engineer will do using Cerve's current frontend technologies.
It simulate a simple version of how a regular workflow will work in one of Cerve's actual applications.


#### Task
Implement the following in this repository using Cerve's choice of frontend framework, Stimulus.
For this task, it will not be necessary for any new project dependencies to be added. Make sure
that you implement the design pixel perfect. The design is currently for mobile, but should be
implemented in a way for future support for desktop and tablet.

1. Implement the following design for mobile: 
   - https://zpl.io/2pWev5E (default design)
   - https://zpl.io/VD89Aee (scrolled design)
2. The carousels will require horizontal scrolling with small fixed amount of products displayed
   on DOM
3. The page should have 10 carousels that are vertically scrollable

Consider:
 - Each carousel may have up to 2000 products
 - Solution must be completely on the frontend (avoid backend pagination)

Example of basic scroll without fixed amount of products:

https://user-images.githubusercontent.com/6445086/149668832-b4df4c60-c3a9-4ca1-a080-8548f713a5e2.mov


#### Getting started
Create a private fork of this repository and run the following commands after cloning:
```
cd stimulus-starter

./install_go_osx.sh

## only if you are using macos 
## NOTE(dev): probably necessary to edit the env in this file
source env.sh

npm install
npm run start

## in another CLI
go run cmd/main.go
```


### References
- https://stimulus.hotwired.dev/
- https://basscss.com/
