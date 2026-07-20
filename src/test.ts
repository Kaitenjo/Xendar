import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
  @import { compile } from "@xaendar/compiler";
  @import { writeFileSync } from "fs";

  <div class="table-container">
  <div class="toolbar">
    <button class="btn btn-primary" @click="addRandomRow()">
      ➕ Aggiungi riga (posizione casuale)
    </button>
    <button class="btn btn-secondary" @click="addRowAtEnd()">
      ⬇️ Aggiungi riga in coda
    </button>
  </div>

  @if (items().length) {
    <table class="user-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>Email</th>
          <th>Ruolo</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody>
        @for (row of items(); track row.id) {
          <tr>
            <td>{ row.id }</td>
            <td>{ row.name }</td>
            <td>{ row.email }</td>
            <td>{ row.role }</td>
            <td>
              <button class="btn btn-danger" @click="deleteRow(row.id)">
                🗑️ Elimina
              </button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  } @else {
    <p class="empty-message">Nessuna riga presente. Aggiungine una!</p>
  }
</div>
  `

const filePath = 'dist/compiled.js'
const output = compile(template, 'TestComponent').then(output => {
  writeFileSync(filePath, output.javascript);
  writeFileSync('dist/compiled.ts', output.typescript);
});
