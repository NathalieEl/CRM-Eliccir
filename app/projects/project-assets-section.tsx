import Link from "next/link";
import { createProjectAsset, updateProjectGroupName } from "@/app/properties/actions";

type ProjectAsset = {
  id: string;
  reference: string;
  title: string;
  type: string;
  status: string;
  landParcelId: string | null;
  landParcel: { id: string; title: string } | null;
};

const propertyTypes = [
  ["LAND", "Terrain"],
  ["LOT", "Lot"],
  ["VILLA", "Villa"],
  ["HOUSE", "Maison"],
  ["APARTMENT", "Appartement"],
  ["COMMERCIAL", "Local commercial"],
  ["BUILDING", "Bâtiment"],
  ["WAREHOUSE", "Entrepôt"],
  ["GUESTHOUSE_HOTEL", "Maison d’hôtes / hôtel"],
] as const;

const propertyStatuses = [
  ["AVAILABLE", "Disponible"],
  ["UNDER_OFFER", "Sous offre"],
  ["SOLD", "Vendu"],
  ["RENTED", "Loué"],
  ["WITHDRAWN", "Retiré"],
] as const;

type ProjectAssetsSectionProps = {
  projectId: string;
  returnPropertyId: string;
  projectName: string;
  assets: ProjectAsset[];
  editable: boolean;
};

export function ProjectAssetsSection({ projectId, returnPropertyId, projectName, assets, editable }: ProjectAssetsSectionProps) {
  const landParcels = assets.filter((asset) => asset.type === "LAND");
  const derivedAssets = assets.filter((asset) => asset.type !== "LAND");

  return (
    <section className="contacts-create-section profile-section">
      <div className="contacts-section-heading">
        <div>
          <p className="section-index">TERRAINS ET BIENS</p>
          <h2>{projectName}</h2>
          <p className="contacts-intro">{landParcels.length} terrain{landParcels.length > 1 ? "s" : ""} · {derivedAssets.length} bien{derivedAssets.length > 1 ? "s" : ""} rattaché{derivedAssets.length > 1 ? "s" : ""}</p>
          {editable ? <form action={updateProjectGroupName} className="contact-form project-group-name-form">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="returnPropertyId" value={returnPropertyId} />
            <label><span className="field-title">Nom du projet</span><input name="projectName" defaultValue={projectName} required minLength={2} maxLength={200} /></label>
            <button type="submit" className="contact-cancel-link">Enregistrer le nom</button>
          </form> : null}
        </div>
        <span className="contacts-list-count">{assets.length}</span>
      </div>

      {assets.length ? (
        <div className="contacts-records-wrap">
          <table className="contacts-records contacts-data-table projects-data-table">
            <thead><tr><th>BIEN</th><th>TYPE</th><th>TERRAIN PARENT</th><th>STATUT</th></tr></thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td data-label="Bien"><b><Link href={`/projects/${asset.id}`}>{asset.title}</Link></b><small>{asset.reference}</small></td>
                  <td data-label="Type">{propertyTypes.find(([value]) => value === asset.type)?.[1] ?? asset.type}</td>
                  <td data-label="Terrain parent">{asset.landParcel ? <Link href={`/projects/${asset.landParcel.id}`}>{asset.landParcel.title}</Link> : asset.type === "LAND" ? "Terrain autonome" : "—"}</td>
                  <td data-label="Statut">{propertyStatuses.find(([value]) => value === asset.status)?.[1] ?? asset.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="contacts-empty">Aucun bien n’est encore rattaché à ce projet.</p>}

      {editable ? (
        <form action={createProjectAsset} className="contact-form project-assets-create-form">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="returnPropertyId" value={returnPropertyId} />
          <label><span className="field-title">Référence</span><input name="reference" required minLength={2} maxLength={80} /></label>
          <label><span className="field-title">Nom du bien</span><input name="title" required minLength={2} maxLength={200} /></label>
          <label><span className="field-title">Type</span><select name="type" defaultValue="LAND" required>{propertyTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label><span className="field-title">Terrain parent</span><select name="landParcelId" defaultValue=""><option value="">Terrain autonome</option>{landParcels.map((parcel) => <option value={parcel.id} key={parcel.id}>{parcel.title}</option>)}</select></label>
          <label><span className="field-title">Statut</span><select name="status" defaultValue="AVAILABLE" required>{propertyStatuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <p className="support-privacy-note">Un bien autre qu’un terrain doit être rattaché à un terrain de ce projet.</p>
          <button className="contact-primary-button" type="submit">Ajouter au projet</button>
        </form>
      ) : null}
    </section>
  );
}