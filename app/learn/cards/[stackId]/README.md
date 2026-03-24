# app/learn/cards/[stackId]

Stack-scoped learning page.

- `page.tsx`: Loads localized stack/group context, filters species with images, drives the learning UI with shuffle,
  previous/next navigation, and side-by-side info-pane controls, and exits back to the parent collection when one
  exists. The page now uses a desktop + bottom-console session layout where back/navigation controls, stack context, and
  progress are grouped into the full-width bottom toolbar, with the image carousel rendered as a floating desktop
  surface and details rendered in a separate Verdant Scholar-style card.
