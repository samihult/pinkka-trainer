import { http, HttpResponse } from "msw";
import mockData from "@/test-assets/pinkka/mock-data.json";

const BASE_URL = "https://fmnh-ws-prod3.it.helsinki.fi/pinkka/api";

const groups = mockData.groups ?? [];
const groupsById = mockData.groupsById ?? {};
const subStacksById = mockData.subStacksById ?? {};
const speciesById = mockData.speciesById ?? {};

export const pinkkaHandlers = [
  http.get(`${BASE_URL}/pinkkas/`, () => HttpResponse.json(groups)),
  http.get(`${BASE_URL}/pinkkas/:groupId`, ({ params }) => {
    const groupId = String(params.groupId);
    const group = groupsById[groupId];
    if (!group) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(group);
  }),
  http.get(`${BASE_URL}/subpinkkas/:subStackId`, ({ params }) => {
    const subStackId = String(params.subStackId);
    const subStack = subStacksById[subStackId];
    if (!subStack) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(subStack);
  }),
  http.get(`${BASE_URL}/speciescards/:speciesId`, ({ params }) => {
    const speciesId = String(params.speciesId);
    const species = speciesById[speciesId];
    if (!species) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(species);
  }),
];
